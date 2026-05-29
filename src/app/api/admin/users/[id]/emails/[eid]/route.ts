/** DELETE /api/admin/users/[id]/emails/[eid] — 이메일 별칭 삭제 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eid: string }> }
) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id, eid } = await params;
  await db.prepare("DELETE FROM email_aliases WHERE id = ? AND user_id = ?").bind(eid, id).run();

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(
    `INSERT INTO admin_log (admin_email, action, target_type, target_id, created_at) VALUES ($1, 'delete_email', 'email', $2, $3)`,
    [check.email, eid, Date.now()]
  );
  return NextResponse.json({ ok: true });
}
