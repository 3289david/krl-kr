/** DELETE /api/admin/users/[id]/links/[lid] — 링크 삭제 / PATCH — 비활성화 토글 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lid: string }> }
) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id, lid } = await params;
  const link = await db.prepare("SELECT is_active FROM links WHERE id = ? AND user_id = ?").bind(lid, id).first<{ is_active: number }>();
  if (!link) return NextResponse.json({ error: "링크를 찾을 수 없습니다." }, { status: 404 });

  await db.prepare("UPDATE links SET is_active = ? WHERE id = ?").bind(link.is_active ? 0 : 1, lid).run();
  return NextResponse.json({ ok: true, is_active: !link.is_active });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lid: string }> }
) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id, lid } = await params;
  await db.prepare("DELETE FROM links WHERE id = ? AND user_id = ?").bind(lid, id).run();

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(
    `INSERT INTO admin_log (admin_email, action, target_type, target_id, created_at) VALUES ($1, 'delete_link', 'link', $2, $3)`,
    [check.email, lid, Date.now()]
  );
  return NextResponse.json({ ok: true });
}
