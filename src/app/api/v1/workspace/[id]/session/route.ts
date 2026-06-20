import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { getPool } from "@/lib/db/postgres";
import { generateId } from "@/lib/utils";
import { randomBytes } from "crypto";
import { checkStorageQuota } from "@/lib/storage-quota";

export const runtime = "nodejs";

// 플랜별 세션 유효시간 (0 = 무제한 → 24h 토큰)
const PLAN_SESSION_MS: Record<string, number> = {
  free: 30 * 60 * 1000,
  pro: 0,
  vip: 0,
};

// 플랜별 디스크 한도 (워크스페이스당)
const PLAN_DISK_BYTES: Record<string, number> = {
  free: 512 * 1024 * 1024,
  pro: 5 * 1024 ** 3,
  vip: 20 * 1024 ** 3,
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const now = Date.now();

    // 워크스페이스 소유권 확인
    const wsRes = await pool.query(
      "SELECT * FROM workspaces WHERE id=$1 AND user_id=$2 AND status='active'",
      [id, user.id]
    );
    if (!wsRes.rows.length) {
      return NextResponse.json({ error: "워크스페이스를 찾을 수 없습니다." }, { status: 404 });
    }
    const workspace = wsRes.rows[0];

    const planRes = await pool.query("SELECT plan FROM user_plans WHERE user_id=$1", [user.id]);
    const plan = planRes.rows[0]?.plan ?? "free";

    // ── 보안 검사 1: 통합 저장 공간 초과 여부 ────────────
    const quota = await checkStorageQuota(pool, user.id);
    if (!quota.ok) {
      return NextResponse.json(
        { error: "저장 공간이 부족합니다. 파일을 정리하거나 플랜을 업그레이드하세요." },
        { status: 403 }
      );
    }

    // ── 보안 검사 2: 워크스페이스 디스크 한도 ────────────
    const diskLimit = PLAN_DISK_BYTES[plan] ?? PLAN_DISK_BYTES.free;
    if (Number(workspace.disk_bytes) > diskLimit) {
      return NextResponse.json(
        { error: `워크스페이스 디스크 한도(${(diskLimit / 1024 ** 2).toFixed(0)}MB)를 초과했습니다. 파일을 정리하세요.` },
        { status: 403 }
      );
    }

    // ── 보안 검사 3: 이 워크스페이스의 기존 활성 세션 정리 ──
    // 만료된 세션 삭제
    await pool.query("DELETE FROM workspace_sessions WHERE workspace_id=$1 AND expires_at<$2", [id, now]);
    // 살아있는 세션이 있으면 재사용 (중복 세션 방지)
    const existingRes = await pool.query(
      "SELECT id, token, expires_at FROM workspace_sessions WHERE workspace_id=$1 AND expires_at>$2 LIMIT 1",
      [id, now]
    );
    if (existingRes.rows.length) {
      // 기존 세션 만료 시간 연장 후 반환
      const existing = existingRes.rows[0];
      const sessionMs = PLAN_SESSION_MS[plan] ?? PLAN_SESSION_MS.free;
      const newExpiry = sessionMs > 0 ? now + sessionMs : now + 24 * 60 * 60 * 1000;
      await pool.query("UPDATE workspace_sessions SET expires_at=$1, last_ping_at=$2 WHERE id=$3", [newExpiry, now, existing.id]);
      await pool.query("UPDATE workspaces SET last_active_at=$1 WHERE id=$2", [now, id]);
      return NextResponse.json({
        session: {
          id: existing.id,
          token: existing.token,
          expires_at: newExpiry,
          plan,
          unlimited: sessionMs === 0,
        },
      });
    }

    // ── 새 세션 생성 ──────────────────────────────────────
    const sessionMs = PLAN_SESSION_MS[plan] ?? PLAN_SESSION_MS.free;
    const expiresAt = sessionMs > 0 ? now + sessionMs : now + 24 * 60 * 60 * 1000;

    const sessionId = generateId("wss");
    // 암호학적으로 안전한 랜덤 토큰 (64 hex chars)
    const token = randomBytes(32).toString("hex");

    await pool.query(
      `INSERT INTO workspace_sessions (id, workspace_id, user_id, token, created_at, expires_at, last_ping_at)
       VALUES ($1,$2,$3,$4,$5,$6,$5)`,
      [sessionId, id, user.id, token, now, expiresAt]
    );

    await pool.query("UPDATE workspaces SET last_active_at=$1 WHERE id=$2", [now, id]);

    return NextResponse.json({
      session: { id: sessionId, token, expires_at: expiresAt, plan, unlimited: sessionMs === 0 },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
