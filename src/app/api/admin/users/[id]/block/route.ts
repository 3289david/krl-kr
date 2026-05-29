/**
 * POST   /api/admin/users/[id]/block   → 사용자 차단
 * DELETE /api/admin/users/[id]/block   → 차단 해제
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin, MASTER_ADMIN_EMAIL } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id } = await params;
  const { reason, expires_at, block_type = "full", appeal_allowed = 1 } = await request.json();

  const user = await db
    .prepare("SELECT id, email FROM users WHERE id = ? LIMIT 1")
    .bind(id)
    .first<{ id: string; email: string }>();

  if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

  // 마스터 관리자 보호
  if (user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "마스터 관리자는 차단할 수 없습니다." }, { status: 403 });
  }

  const blockedAt = Date.now();
  // 만료일 없으면 30일 후 자동삭제
  const autoDeleteAt = expires_at ?? (blockedAt + 30 * 24 * 60 * 60 * 1000);

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(
    `INSERT INTO user_blocks (user_id, email, reason, blocked_by, blocked_at, expires_at, block_type, appeal_allowed, auto_delete_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id) DO UPDATE SET reason = $3, blocked_by = $4, blocked_at = $5, expires_at = $6, block_type = $7, appeal_allowed = $8, auto_delete_at = $9`,
    [user.id, user.email, reason ?? null, check.email, blockedAt, expires_at ?? null, block_type, appeal_allowed ? 1 : 0, autoDeleteAt]
  );

  // 로그
  await pool.query(
    `INSERT INTO admin_log (admin_email, action, target_type, target_id, target_email, details, created_at)
     VALUES ($1, 'block_user', 'user', $2, $3, $4, $5)`,
    [check.email, user.id, user.email, reason ?? "", Date.now()]
  );

  return NextResponse.json({ ok: true, email: user.email });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id } = await params;

  // 마스터 관리자 보호
  const user = await db.prepare("SELECT email FROM users WHERE id = ? LIMIT 1").bind(id).first<{ email: string }>();
  if (user?.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "마스터 관리자는 차단 해제할 수 없습니다. (차단된 적 없음)" }, { status: 403 });
  }

  await db.prepare("DELETE FROM user_blocks WHERE user_id = ?").bind(id).run();

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(
    `INSERT INTO admin_log (admin_email, action, target_type, target_id, created_at) VALUES ($1, 'unblock_user', 'user', $2, $3)`,
    [check.email, id, Date.now()]
  );

  return NextResponse.json({ ok: true });
}
