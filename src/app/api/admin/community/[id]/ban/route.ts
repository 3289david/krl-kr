/**
 * POST   /api/admin/community/[id]/ban   → 커뮤니티 차단
 * DELETE /api/admin/community/[id]/ban   → 차단 해제
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
  const { reason, expires_at } = await request.json();

  const user = await db
    .prepare("SELECT id, email FROM users WHERE id = ? LIMIT 1")
    .bind(id)
    .first<{ id: string; email: string }>();

  if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  if (user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "마스터 관리자는 커뮤니티 차단할 수 없습니다." }, { status: 403 });
  }

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(
    `INSERT INTO community_bans (user_id, email, reason, banned_by, banned_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET reason = $3, banned_by = $4, banned_at = $5, expires_at = $6`,
    [user.id, user.email, reason ?? null, check.email, Date.now(), expires_at ?? null]
  );

  await pool.query(
    `INSERT INTO admin_log (admin_email, action, target_type, target_id, target_email, details, created_at)
     VALUES ($1, 'community_ban', 'user', $2, $3, $4, $5)`,
    [check.email, user.id, user.email, reason ?? "", Date.now()]
  );

  return NextResponse.json({ ok: true });
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
  await db.prepare("DELETE FROM community_bans WHERE user_id = ?").bind(id).run();

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(
    `INSERT INTO admin_log (admin_email, action, target_type, target_id, created_at) VALUES ($1, 'community_unban', 'user', $2, $3)`,
    [check.email, id, Date.now()]
  );

  return NextResponse.json({ ok: true });
}
