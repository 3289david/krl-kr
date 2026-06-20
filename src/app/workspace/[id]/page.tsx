"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import "@xterm/xterm/css/xterm.css";

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: number;
}

interface Workspace {
  id: string;
  name: string;
  dir_path: string;
  disk_bytes: number;
  github_url?: string;
}

// ---- Terminal component (uses xterm.js dynamically loaded) ----
function Terminal({ token, wsId }: { token: string; wsId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<unknown>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<"connecting" | "ready" | "closed">("connecting");

  useEffect(() => {
    let term: unknown;
    let ws: WebSocket;
    let destroyed = false;

    async function init() {
      // Dynamically import xterm
      const { Terminal: XTerm } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      const { WebLinksAddon } = await import("@xterm/addon-web-links");

      if (destroyed || !containerRef.current) return;

      term = new XTerm({
        fontFamily: "GeistMono, 'Cascadia Code', 'Fira Code', monospace",
        fontSize: 13,
        lineHeight: 1.4,
        theme: {
          background: "#0d1117",
          foreground: "#e6edf3",
          cursor: "#e6edf3",
          black: "#484f58",
          red: "#ff7b72",
          green: "#3fb950",
          yellow: "#d29922",
          blue: "#58a6ff",
          magenta: "#bc8cff",
          cyan: "#39c5cf",
          white: "#b1bac4",
          brightBlack: "#6e7681",
          brightRed: "#ffa198",
          brightGreen: "#56d364",
          brightYellow: "#e3b341",
          brightBlue: "#79c0ff",
          brightMagenta: "#d2a8ff",
          brightCyan: "#56d4dd",
          brightWhite: "#f0f6fc",
        },
        cursorBlink: true,
        allowProposedApi: true,
      });
      termRef.current = term;

      const fitAddon = new FitAddon();
      (term as { loadAddon: (a: unknown) => void }).loadAddon(fitAddon);
      (term as { loadAddon: (a: unknown) => void }).loadAddon(new WebLinksAddon());
      (term as { open: (el: HTMLElement) => void }).open(containerRef.current!);
      fitAddon.fit();

      const resizeObs = new ResizeObserver(() => { try { fitAddon.fit(); } catch {} });
      resizeObs.observe(containerRef.current!);

      // Connect to WebSocket terminal server (proxied via nginx /ws-terminal)
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${proto}//${window.location.host}/ws-terminal`;
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        const dims = (term as { cols: number; rows: number });
        ws.send(JSON.stringify({ type: "auth", token, cols: dims.cols, rows: dims.rows }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "ready") {
          setStatus("ready");
          (term as { write: (s: string) => void }).write(`\x1b[32mKRL Cloud IDE\x1b[0m — 워크스페이스: ${wsId}\r\n\x1b[90m${msg.cwd}\x1b[0m\r\n\r\n`);
        } else if (msg.type === "output") {
          (term as { write: (s: string) => void }).write(msg.data);
        } else if (msg.type === "exit") {
          setStatus("closed");
          (term as { write: (s: string) => void }).write("\r\n\x1b[31m[세션 종료]\x1b[0m\r\n");
        }
      };

      ws.onclose = () => {
        if (!destroyed) setStatus("closed");
      };

      ws.onerror = () => {
        if (!destroyed) setStatus("closed");
        (term as { write: (s: string) => void }).write("\r\n\x1b[31m[연결 오류]\x1b[0m\r\n");
      };

      // Send input to terminal
      (term as { onData: (cb: (d: string) => void) => void }).onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "input", data }));
        }
      });

      // Resize events
      (term as { onResize: (cb: (s: { cols: number; rows: number }) => void) => void }).onResize(({ cols, rows }: { cols: number; rows: number }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "resize", cols, rows }));
        }
      });

      // Ping every 30s
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);

      return () => {
        clearInterval(pingInterval);
        resizeObs.disconnect();
      };
    }

    init();

    return () => {
      destroyed = true;
      if (ws) ws.close();
      if (term) (term as { dispose: () => void }).dispose();
    };
  }, [token, wsId]);

  return (
    <div style={{ position: "relative", height: "100%", background: "#0d1117", borderRadius: 8, overflow: "hidden" }}>
      {status === "connecting" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, background: "#0d1117", color: "#e6edf3", fontSize: ".875rem" }}>
          연결 중...
        </div>
      )}
      {status === "closed" && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#21262d", padding: "8px 16px", fontSize: ".8125rem", color: "#ff7b72", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
          <span>세션이 종료되었습니다.</span>
          <button onClick={() => window.location.reload()} style={{ padding: "4px 12px", background: "#388bfd", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: ".8125rem" }}>재연결</button>
        </div>
      )}
      <div ref={containerRef} style={{ height: "100%", padding: 4 }} />
    </div>
  );
}

// ---- File Manager ----
function FileManager({ wsId, onFileOpen }: { wsId: string; onFileOpen: (path: string, content: string) => void }) {
  const [path, setPath] = useState("/");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingNew, setEditingNew] = useState<"file" | "folder" | null>(null);
  const [newName, setNewName] = useState("");

  const load = useCallback(async (p: string) => {
    setLoading(true);
    const r = await fetch(`/api/v1/workspace/${wsId}/files?path=${encodeURIComponent(p)}`);
    const d = await r.json();
    setEntries(d.entries ?? []);
    setPath(p);
    setLoading(false);
  }, [wsId]);

  useEffect(() => { load("/"); }, [load]);

  async function openFile(entry: FileEntry) {
    if (entry.is_dir) { load(entry.path); return; }
    const r = await fetch(`/api/v1/workspace/${wsId}/files?path=${encodeURIComponent(entry.path)}&action=read`);
    const d = await r.json();
    if (d.content !== undefined) onFileOpen(entry.path, d.content);
  }

  async function deleteEntry(entry: FileEntry, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`"${entry.name}" 을 삭제하시겠습니까?`)) return;
    await fetch(`/api/v1/workspace/${wsId}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", path: entry.path }),
    });
    load(path);
  }

  async function createNew(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const newPath = path === "/" ? `/${newName}` : `${path}/${newName}`;
    await fetch(`/api/v1/workspace/${wsId}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: editingNew === "folder" ? "mkdir" : "write", path: newPath, content: "" }),
    });
    setEditingNew(null); setNewName("");
    load(path);
  }

  const parts = path.split("/").filter(Boolean);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--color-canvas)", border: "1px solid var(--color-hairline)", borderRadius: 8, overflow: "hidden" }}>
      {/* Breadcrumb */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        <button onClick={() => load("/")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: ".75rem", color: "var(--color-muted)", padding: "2px 4px" }}>~</button>
        {parts.map((part, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "var(--color-muted)", fontSize: ".75rem" }}>/</span>
            <button onClick={() => load("/" + parts.slice(0, i + 1).join("/"))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: ".75rem", color: "var(--color-ink)", padding: "2px 4px" }}>{part}</button>
          </span>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <button onClick={() => setEditingNew("file")} title="새 파일" style={{ padding: "2px 6px", border: "1px solid var(--color-hairline)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: ".75rem" }}>+파일</button>
          <button onClick={() => setEditingNew("folder")} title="새 폴더" style={{ padding: "2px 6px", border: "1px solid var(--color-hairline)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: ".75rem" }}>+폴더</button>
          <button onClick={() => load(path)} style={{ padding: "2px 6px", border: "1px solid var(--color-hairline)", borderRadius: 4, background: "none", cursor: "pointer", fontSize: ".75rem" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
        </div>
      </div>

      {/* New item form */}
      {editingNew && (
        <form onSubmit={createNew} style={{ padding: "6px 12px", borderBottom: "1px solid var(--color-hairline)", display: "flex", gap: 6 }}>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder={editingNew === "folder" ? "폴더 이름" : "파일 이름"} style={{ flex: 1, padding: "4px 8px", border: "1px solid var(--color-hairline)", borderRadius: 6, fontSize: ".8125rem" }} />
          <button type="submit" style={{ padding: "4px 10px", background: "var(--color-ink)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: ".75rem" }}>확인</button>
          <button type="button" onClick={() => { setEditingNew(null); setNewName(""); }} style={{ padding: "4px 8px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: "none", cursor: "pointer", fontSize: ".75rem" }}>취소</button>
        </form>
      )}

      {/* File list */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {loading ? (
          <p style={{ padding: 12, fontSize: ".8125rem", color: "var(--color-muted)" }}>불러오는 중...</p>
        ) : entries.length === 0 ? (
          <p style={{ padding: 12, fontSize: ".8125rem", color: "var(--color-muted)", textAlign: "center" }}>비어 있음</p>
        ) : entries.map(entry => (
          <div key={entry.path} onClick={() => openFile(entry)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", cursor: "pointer", fontSize: ".8125rem", borderBottom: "1px solid var(--color-hairline)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-hairline)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {entry.is_dir ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            )}
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</span>
            {!entry.is_dir && <span style={{ color: "var(--color-muted)", fontSize: ".7rem", flexShrink: 0 }}>{entry.size < 1024 ? `${entry.size}B` : `${(entry.size / 1024).toFixed(0)}K`}</span>}
            <button onClick={e => deleteEntry(entry, e)} style={{ padding: "1px 4px", border: "none", background: "none", cursor: "pointer", color: "var(--color-muted)", flexShrink: 0, opacity: 0.6 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Editor ----
function Editor({ wsId, filePath, initialContent, onClose }: { wsId: string; filePath: string; initialContent: string; onClose: () => void }) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);

  async function save() {
    setSaving(true);
    await fetch(`/api/v1/workspace/${wsId}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "write", path: filePath, content }),
    });
    setSaving(false); setSaved(true);
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#1e1e2e", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "6px 12px", borderBottom: "1px solid #313244", display: "flex", alignItems: "center", gap: 8, background: "#181825" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#cdd6f4" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span style={{ flex: 1, fontSize: ".8125rem", color: "#cdd6f4", fontFamily: "monospace" }}>{filePath}</span>
        {!saved && <span style={{ fontSize: ".75rem", color: "#f38ba8" }}>수정됨</span>}
        <button onClick={save} disabled={saving || saved} style={{ padding: "3px 10px", background: saved ? "#313244" : "#89b4fa", color: saved ? "#6c7086" : "#1e1e2e", border: "none", borderRadius: 4, cursor: saving ? "default" : "pointer", fontSize: ".75rem", fontWeight: 600 }}>{saving ? "저장 중..." : "저장"}</button>
        <button onClick={onClose} style={{ padding: "3px 8px", background: "none", border: "none", color: "#6c7086", cursor: "pointer", fontSize: ".75rem" }}>닫기</button>
      </div>
      <textarea
        value={content}
        onChange={e => { setContent(e.target.value); setSaved(false); }}
        spellCheck={false}
        style={{ flex: 1, background: "#1e1e2e", color: "#cdd6f4", border: "none", outline: "none", padding: "12px", fontFamily: "GeistMono, 'Cascadia Code', 'Fira Code', monospace", fontSize: "13px", lineHeight: 1.6, resize: "none", tabSize: 2 }}
        onKeyDown={e => {
          if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(); }
          if (e.key === "Tab") {
            e.preventDefault();
            const ta = e.currentTarget;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const newVal = content.slice(0, start) + "  " + content.slice(end);
            setContent(newVal);
            setSaved(false);
            requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
          }
        }}
      />
    </div>
  );
}

// ---- Main IDE page ----
export default function WorkspaceIDEPage() {
  const { id } = useParams<{ id: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [session, setSession] = useState<{ token: string; expires_at: number; unlimited: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [layout, setLayout] = useState<"split" | "terminal" | "files">("split");
  const [openFile, setOpenFile] = useState<{ path: string; content: string } | null>(null);

  useEffect(() => {
    async function init() {
      // Load workspace info
      const wr = await fetch(`/api/v1/workspace/${id}`);
      const wd = await wr.json();
      if (wd.error) { setErr(wd.error); setLoading(false); return; }
      setWorkspace(wd.workspace);

      // Create session
      const sr = await fetch(`/api/v1/workspace/${id}/session`, { method: "POST" });
      const sd = await sr.json();
      if (sd.error) { setErr(sd.error); setLoading(false); return; }
      setSession(sd.session);
      setLoading(false);
    }
    init();
  }, [id]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--color-muted)" }}>
      워크스페이스 로드 중...
    </div>
  );

  if (err) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 12 }}>
      <p style={{ color: "#dc2626" }}>{err}</p>
      <a href="/dashboard/claude-code" style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>워크스페이스 목록으로</a>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ height: 44, background: "var(--color-canvas)", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0 }}>
        <a href="/dashboard/claude-code" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", color: "var(--color-muted)", fontSize: ".8125rem" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          워크스페이스
        </a>
        <span style={{ color: "var(--color-hairline)" }}>/</span>
        <span style={{ fontWeight: 600, fontSize: ".875rem" }}>{workspace?.name}</span>

        {session && !session.unlimited && (
          <SessionTimer expiresAt={session.expires_at} />
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {[["split", "분할"], ["terminal", "터미널"], ["files", "파일"]].map(([v, l]) => (
            <button key={v} onClick={() => setLayout(v as typeof layout)} style={{ padding: "4px 10px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: layout === v ? "var(--color-ink)" : "transparent", color: layout === v ? "var(--color-canvas)" : "var(--color-ink)", cursor: "pointer", fontSize: ".75rem", fontWeight: layout === v ? 600 : 400 }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: 8, padding: 8 }}>
        {/* File manager pane */}
        {(layout === "split" || layout === "files") && (
          <div style={{ width: layout === "files" ? "100%" : 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
            <FileManager wsId={id} onFileOpen={(path, content) => { setOpenFile({ path, content }); if (layout === "files") setLayout("split"); }} />
          </div>
        )}

        {/* Center / right pane */}
        {(layout === "split" || layout === "terminal") && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden", minWidth: 0 }}>
            {openFile && layout === "split" && (
              <div style={{ height: "40%", flexShrink: 0 }}>
                <Editor wsId={id} filePath={openFile.path} initialContent={openFile.content} onClose={() => setOpenFile(null)} />
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              {session && <Terminal token={session.token} wsId={id} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionTimer({ expiresAt }: { expiresAt: number }) {
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const iv = setInterval(() => setRemaining(Math.max(0, expiresAt - Date.now())), 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const isLow = remaining < 5 * 60 * 1000;

  return (
    <span style={{ fontSize: ".75rem", color: isLow ? "#dc2626" : "var(--color-muted)", fontFamily: "monospace", marginLeft: 8 }}>
      {remaining === 0 ? "세션 만료" : `${mins}:${String(secs).padStart(2, "0")}`}
    </span>
  );
}
