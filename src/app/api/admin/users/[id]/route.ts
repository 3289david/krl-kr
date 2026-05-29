/**
 * GET    /api/admin/users/[id]  → 사용자 상세 + 리소스 목록
 * DELETE /api/admin/users/[id]  → 계정 삭제
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin, MASTER_ADMIN_EMAIL } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id } = await params;
  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  const [user, links, emails, subdomains, block, communityBan, notes, appeals] = await Promise.all([
    pool.query(`SELECT id, email, name, plan, verified, created_at FROM users WHERE id = $1`, [id]),
    pool.query(`SELECT id, slug, original_url, title, click_count, is_active, created_at FROM links WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [id]),
    pool.query(`SELECT id, alias, forward_to, is_active, created_at FROM email_aliases WHERE user_id = $1 ORDER BY created_at DESC`, [id]),
    pool.query(`SELECT id, subdomain, type, target, is_active, created_at FROM subdomains WHERE user_id = $1 ORDER BY created_at DESC`, [id]),
    pool.query(`SELECT * FROM user_blocks WHERE user_id = $1 LIMIT 1`, [id]),
    pool.query(`SELECT * FROM community_bans WHERE user_id = $1 LIMIT 1`, [id]),
    pool.query(`SELECT * FROM user_notes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [id]),
    pool.query(`SELECT * FROM block_appeals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`, [id]),
  ]);

  if (user.rows.length === 0) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

  return NextResponse.json({
    user: user.rows[0],
    links: links.rows,
    emails: emails.rows,
    subdomains: subdomains.rows,
    block: block.rows[0] ?? null,
    communityBan: communityBan.rows[0] ?? null,
    notes: notes.rows,
    appeals: appeals.rows,
    isMaster: user.rows[0].email === MASTER_ADMIN_EMAIL,
  });
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
  const user = await db
    .prepare("SELECT email FROM users WHERE id = ? LIMIT 1")
    .bind(id)
    .first<{ email: string }>();

  if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  if (user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "마스터 관리자 계정은 삭제할 수 없습니다." }, { status: 403 });
  }

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  // 관련 데이터 삭제 후 계정 삭제
  await pool.query(`DELETE FROM links WHERE user_id = $1`, [id]);
  await pool.query(`DELETE FROM email_aliases WHERE user_id = $1`, [id]);
  await pool.query(`DELETE FROM subdomains WHERE user_id = $1`, [id]);
  await pool.query(`DELETE FROM user_blocks WHERE user_id = $1`, [id]);
  await pool.query(`DELETE FROM community_bans WHERE user_id = $1`, [id]);
  await pool.query(`DELETE FROM api_keys WHERE user_id = $1`, [id]);
  await pool.query(`DELETE FROM users WHERE id = $1`, [id]);

  // 로그
  await pool.query(
    `INSERT INTO admin_log (admin_email, action, target_type, target_id, target_email, details, created_at)
     VALUES ($1, 'delete_account', 'user', $2, $3, '계정 및 모든 데이터 삭제', $4)`,
    [check.email, id, user.email, Date.now()]
  );

  return NextResponse.json({ ok: true });
}
