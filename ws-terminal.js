// KRL Cloud IDE — 보안 WebSocket 터미널 서버
// bwrap 샌드박스 + krl-worker 권한 분리 + 환경변수 격리
const fs = require("fs");
const path = require("path");

// .env.local 로드 (ws-terminal 자체용 DB 접속에만 사용)
const envFile = path.join(__dirname, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    const key = t.slice(0, idx).trim();
    const val = t.slice(idx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
}

const { WebSocketServer } = require("ws");
const pty = require("node-pty");
const { Pool } = require("pg");
const { execSync, spawn: childSpawn } = require("child_process");

const PORT = 3031;

if (!process.env.DATABASE_URL) {
  console.error("[ws-terminal] 치명적 오류: DATABASE_URL 미설정");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ──────────────────────────────────────────────────────────
// bwrap 샌드박스 인수 생성
// 격리 내용:
//   - /usr (ro): 시스템 바이너리만
//   - /etc (ro): DNS·인증서·passwd (시크릿 없음)
//   - /workspace (rw): 사용자 작업 디렉토리만
//   - /tmp (tmpfs): 임시 파일
//   - /proc (새 네임스페이스): 호스트 프로세스 불가시
//   - 환경변수: clearenv 후 안전한 변수만 주입
// ──────────────────────────────────────────────────────────
// ── 샌드박스 내부에서 사용할 uid/gid (호스트의 krl-worker와 무관한 네임스페이스 내부 id) ──
const SANDBOX_UID = 1000;
const SANDBOX_GID = 1000;

// 호스트에서 워크스페이스 디렉토리 소유자로 설정할 krl-worker uid/gid
const WORKER_UID = 997;
const WORKER_GID = 982;

function buildBwrapArgs(workDir, anthropicKey, workspaceId) {
  return [
    // ── 파일시스템: 시스템 바이너리만 (읽기 전용) ──────────
    "--ro-bind", "/usr", "/usr",
    "--ro-bind", "/etc", "/etc",         // DNS·인증서·passwd (시크릿 없음)
    // Ubuntu symlink 구조 복원
    "--symlink", "usr/bin",   "/bin",
    "--symlink", "usr/lib",   "/lib",
    "--symlink", "usr/lib64", "/lib64",
    "--symlink", "usr/sbin",  "/sbin",

    // ── 워크스페이스만 쓰기 가능 ──────────────────────────
    "--bind", workDir, "/workspace",

    // ── 임시 파일시스템 (메모리 기반, 리부팅 시 소멸) ─────
    "--tmpfs", "/tmp",
    "--tmpfs", "/run",
    "--tmpfs", "/root",   // root 홈 접근 차단 (tmpfs로 덮어씀)
    "--tmpfs", "/home",   // 다른 사용자 홈 차단

    // ── 프로세스·디바이스 ─────────────────────────────────
    "--proc", "/proc",
    "--dev",  "/dev",

    // ── 격리 ──────────────────────────────────────────────
    "--unshare-user",      // 사용자 네임스페이스: 내부에서 non-root로 실행
    "--unshare-pid",       // PID 네임스페이스: 호스트 프로세스 불가시·kill 불가
    "--unshare-net",       // 네트워크 네임스페이스: 호스트 loopback(DB·서버) 차단
    "--cap-drop", "all",   // 모든 Linux capability 제거
    "--die-with-parent",   // ws-terminal 종료 시 자동 정리
    "--new-session",       // 새 세션 (터미널 하이재킹 방지)

    // ── 샌드박스 내부 uid/gid (비루트) ───────────────────
    "--uid", String(SANDBOX_UID),
    "--gid", String(SANDBOX_GID),

    // ── 작업 디렉토리 ─────────────────────────────────────
    "--chdir", "/workspace",

    // ── 환경변수: 완전 초기화 후 안전한 변수만 주입 ──────
    // DATABASE_URL, JWT_SECRET, SMTP 비밀번호 등 서버 시크릿은 절대 주입 안 함
    "--clearenv",
    "--setenv", "HOME",         "/workspace",
    "--setenv", "PATH",         "/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/bin:/sbin",
    "--setenv", "TERM",         "xterm-256color",
    "--setenv", "USER",         "worker",
    "--setenv", "LOGNAME",      "worker",
    "--setenv", "LANG",         "en_US.UTF-8",
    "--setenv", "LC_ALL",       "en_US.UTF-8",
    "--setenv", "WORKSPACE_ID", workspaceId,
    "--setenv", "PS1",          "\\[\\e[32m\\]workspace\\[\\e[0m\\]:\\[\\e[34m\\]\\w\\[\\e[0m\\]\\$ ",
    // 사용자가 설정한 Anthropic 키만 주입 (서버 키 아님)
    ...(anthropicKey ? ["--setenv", "ANTHROPIC_API_KEY", anthropicKey] : []),

    // ── 보안 셸 래퍼 (ulimit 설정 포함) ─────────────────
    "/usr/local/bin/krl-ws-shell",
  ];
}

// ──────────────────────────────────────────────────────────
// cgroup v2 컨트롤러 활성화 (서버 시작 시 1회)
// ──────────────────────────────────────────────────────────
try {
  fs.writeFileSync("/sys/fs/cgroup/cgroup.subtree_control", "+cpu +memory +pids");
  console.log("[ws-terminal] cgroup v2 컨트롤러 활성화 완료");
} catch (e) {
  console.error("[ws-terminal] cgroup v2 컨트롤러 활성화 실패 (비치명적):", e.message);
}

// ──────────────────────────────────────────────────────────
// WebSocket 서버
// ──────────────────────────────────────────────────────────
const wss = new WebSocketServer({ port: PORT });
console.log(`[ws-terminal] :${PORT} 에서 수신 대기 중 (bwrap 샌드박스 활성)`);

const sessions = new Map(); // token → state

wss.on("connection", async (ws) => {
  let state = null;

  ws.on("message", async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { ws.close(4000, "invalid json"); return; }

    // ── 첫 메시지: 인증 ──────────────────────────────────
    if (!state) {
      if (msg.type !== "auth") { ws.close(4001, "auth required"); return; }
      if (!msg.token) { ws.close(4002, "no token"); return; }

      const now = Date.now();
      let session;
      try {
        const res = await pool.query(
          `SELECT ws.id, ws.workspace_id, ws.expires_at,
                  w.dir_path, w.user_id AS ws_user_id, w.status AS ws_status
           FROM workspace_sessions ws
           JOIN workspaces w ON w.id = ws.workspace_id
           WHERE ws.token = $1 AND ws.expires_at > $2`,
          [msg.token, now]
        );
        if (!res.rows.length) { ws.close(4003, "invalid/expired session"); return; }
        session = res.rows[0];
        if (session.ws_status !== "active") { ws.close(4004, "workspace inactive"); return; }
      } catch (e) {
        console.error("[ws-terminal] DB 조회 오류:", e.message);
        ws.close(5000, "server error");
        return;
      }

      // Anthropic API 키 조회 (사용자가 설정한 경우)
      let anthropicKey = null;
      try {
        const keyRes = await pool.query(
          "SELECT api_key FROM workspace_anthropic_keys WHERE user_id=$1",
          [session.ws_user_id]
        );
        if (keyRes.rows.length) anthropicKey = keyRes.rows[0].api_key;
      } catch {}

      // 워크스페이스 디렉토리 생성 및 권한 설정
      const workDir = session.dir_path;
      try {
        fs.mkdirSync(workDir, { recursive: true });
        // krl-worker가 쓸 수 있도록 소유권 설정
        fs.chownSync(workDir, WORKER_UID, WORKER_GID);
        fs.chmodSync(workDir, 0o750);
      } catch (e) {
        console.error("[ws-terminal] 디렉토리 설정 오류:", e.message);
      }

      // bwrap 샌드박스 인수 생성
      const bwrapArgs = buildBwrapArgs(workDir, anthropicKey, session.workspace_id);

      // pty 생성 (bwrap 실행)
      let ptyProc;
      try {
        ptyProc = pty.spawn("/usr/bin/bwrap", bwrapArgs, {
          name: "xterm-256color",
          cols: Math.min(Math.max(msg.cols || 80, 10), 500),
          rows: Math.min(Math.max(msg.rows || 24, 5), 200),
          cwd: workDir,
          env: {},  // bwrap의 --clearenv + --setenv가 처리
        });
      } catch (e) {
        console.error("[ws-terminal] pty 생성 오류:", e.message);
        ws.close(5001, "pty spawn failed");
        return;
      }

      // ── cgroup v2: CPU 50% · 메모리 512MB · 프로세스 50개 ───
      const cgroupPath = `/sys/fs/cgroup/krl-sandbox-${session.id}`;
      try {
        fs.mkdirSync(cgroupPath, { recursive: true });
        try { fs.writeFileSync(`${cgroupPath}/cpu.max`,    "50000 100000"); } catch {}
        try { fs.writeFileSync(`${cgroupPath}/memory.max`, "536870912");    } catch {}
        try { fs.writeFileSync(`${cgroupPath}/pids.max`,   "50");           } catch {}
        fs.writeFileSync(`${cgroupPath}/cgroup.procs`, String(ptyProc.pid));
      } catch (e) {
        console.error("[ws-terminal] cgroup 설정 오류 (비치명적):", e.message);
      }

      // ── slirp4netns: 외부 인터넷 허용, 호스트 loopback 차단 ──
      // --disable-host-loopback: 127.0.0.1·::1(DB·서버) 접근 완전 차단
      const slirpProc = childSpawn("slirp4netns", [
        "--configure",
        "--mtu=65520",
        "--disable-host-loopback",
        String(ptyProc.pid),
        "tap0",
      ], { stdio: "pipe", detached: true });
      slirpProc.on("error", (e) => console.error("[slirp4netns] 오류:", e.message));
      slirpProc.stderr.on("data", (d) => {
        const msg = d.toString().trim();
        if (msg) console.error("[slirp4netns]", msg);
      });
      slirpProc.unref();

      state = {
        ptyProc,
        workspaceId: session.workspace_id,
        userId: session.ws_user_id,
        token: msg.token,
        sessionId: session.id,
        workDir,
        cgroupPath,
      };
      sessions.set(msg.token, state);

      // 세션 활성 시각 갱신
      pool.query("UPDATE workspace_sessions SET last_ping_at=$1 WHERE id=$2", [now, session.id]).catch(() => {});

      // pty 출력 → WebSocket
      ptyProc.onData((data) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: "output", data }));
        }
      });

      ptyProc.onExit(({ exitCode }) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: "exit", code: exitCode }));
          ws.close();
        }
        sessions.delete(msg.token);
        pool.query("UPDATE workspace_sessions SET expires_at=$1 WHERE id=$2", [Date.now(), session.id]).catch(() => {});
        // cgroup 정리 (프로세스 모두 종료된 후 디렉토리 삭제)
        setTimeout(() => { try { fs.rmdirSync(cgroupPath); } catch {} }, 2000);
      });

      ws.send(JSON.stringify({ type: "ready", cwd: "/workspace" }));

      // 30초마다 디스크 사용량 업데이트
      state.diskInterval = setInterval(async () => {
        try {
          const out = execSync(`du -sb "${workDir}" 2>/dev/null || echo 0`).toString().trim().split(/\s/)[0];
          const bytes = parseInt(out) || 0;
          await pool.query(
            "UPDATE workspaces SET disk_bytes=$1, last_active_at=$2 WHERE id=$3",
            [bytes, Date.now(), session.workspace_id]
          );
          // 디스크 한도 초과 시 경고 (10GB)
          if (bytes > 10 * 1024 ** 3) {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({ type: "output", data: "\r\n\x1b[31m[경고] 디스크 사용량 한도 초과. 파일을 정리하세요.\x1b[0m\r\n" }));
            }
          }
        } catch {}
      }, 30000);

      return;
    }

    // ── 인증 후 메시지 처리 ────────────────────────────────
    if (msg.type === "input" && state.ptyProc) {
      // 입력 크기 제한 (한 번에 1024바이트 초과 방지)
      const input = typeof msg.data === "string" ? msg.data.slice(0, 1024) : "";
      state.ptyProc.write(input);
    } else if (msg.type === "resize" && state.ptyProc) {
      const cols = Math.min(Math.max(msg.cols || 80, 10), 500);
      const rows = Math.min(Math.max(msg.rows || 24, 5), 200);
      state.ptyProc.resize(cols, rows);
    } else if (msg.type === "ping") {
      await pool.query("UPDATE workspace_sessions SET last_ping_at=$1 WHERE token=$2", [Date.now(), state.token]).catch(() => {});
      ws.send(JSON.stringify({ type: "pong" }));
    }
  });

  ws.on("close", () => {
    if (!state) return;
    if (state.diskInterval) clearInterval(state.diskInterval);
    // 연결 끊겨도 30초 후 pty 종료 (재연결 여지)
    setTimeout(() => {
      if (state.ptyProc) {
        try { state.ptyProc.kill("SIGHUP"); } catch {}
      }
      // cgroup 정리
      if (state.cgroupPath) {
        setTimeout(() => { try { fs.rmdirSync(state.cgroupPath); } catch {} }, 2000);
      }
      sessions.delete(state.token);
    }, 30000);
  });

  ws.on("error", () => {});
});

// ──────────────────────────────────────────────────────────
// 주기적 정리
// ──────────────────────────────────────────────────────────
setInterval(async () => {
  try {
    await pool.query("DELETE FROM workspace_sessions WHERE expires_at < $1", [Date.now()]);
  } catch {}
}, 5 * 60 * 1000);
