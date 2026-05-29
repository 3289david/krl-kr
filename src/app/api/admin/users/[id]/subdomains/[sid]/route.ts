/** DELETE /api/admin/users/[id]/subdomains/[sid] — 서브도메인 삭제 / PATCH — 비활성화 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id, sid } = await params;
  const sub = await db.prepare("SELECT is_active FROM subdomains WHERE id = ? AND user_id = ?").bind(sid, id).first<{ is_active: number }>();
  if (!sub) return NextResponse.json({ error: "서브도메인을 찾을 수 없습니다." }, { status: 404 });

  await db.prepare("UPDATE subdomains SET is_active = ? WHERE id = ?").bind(sub.is_active ? 0 : 1, sid).run();
  return NextResponse.json({ ok: true, is_active: !sub.is_active });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id, sid } = await params;
  await db.prepare("DELETE FROM subdomains WHERE id = ? AND user_id = ?").bind(sid, id).run();

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(
    `INSERT INTO admin_log (admin_email, action, target_type, target_id, created_at) VALUES ($1, 'delete_subdomain', 'subdomain', $2, $3)`,
    [check.email, sid, Date.now()]
  );
  return NextResponse.json({ ok: true });
}
