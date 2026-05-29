/**
 * PATCH /api/admin/appeals/[id]  → 이의제기 처리 (approve/reject)
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id } = await params;
  const { status, admin_response } = await request.json();

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "잘못된 상태입니다." }, { status: 400 });
  }

  const appeal = await db
    .prepare("SELECT * FROM block_appeals WHERE id = ? LIMIT 1")
    .bind(Number(id))
    .first<{ id: number; user_id: string; block_type: string; status: string }>();

  if (!appeal) return NextResponse.json({ error: "이의제기를 찾을 수 없습니다." }, { status: 404 });

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  await pool.query(
    `UPDATE block_appeals SET status = $1, admin_response = $2, reviewed_by = $3, reviewed_at = $4 WHERE id = $5`,
    [status, admin_response ?? null, check.email, Date.now(), Number(id)]
  );

  // 승인이면 차단 해제
  if (status === "approved") {
    if (appeal.block_type === "full") {
      await db.prepare("DELETE FROM user_blocks WHERE user_id = ?").bind(appeal.user_id).run();
    } else if (appeal.block_type === "community") {
      await db.prepare("DELETE FROM community_bans WHERE user_id = ?").bind(appeal.user_id).run();
    }
  }

  // 로그 기록
  await pool.query(
    `INSERT INTO admin_log (admin_email, action, target_type, target_id, details, created_at)
     VALUES ($1, $2, 'appeal', $3, $4, $5)`,
    [check.email, `appeal_${status}`, String(id), admin_response ?? "", Date.now()]
  );

  return NextResponse.json({ ok: true });
}
