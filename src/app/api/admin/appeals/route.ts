/**
 * GET  /api/admin/appeals         → 이의제기 목록 (관리자)
 * POST /api/admin/appeals         → 이의제기 제출 (사용자)
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";

  const appeals = await db
    .prepare(
      `SELECT ba.*, u.name as user_name
       FROM block_appeals ba
       LEFT JOIN users u ON u.id = ba.user_id
       WHERE ba.status = ?
       ORDER BY ba.created_at DESC LIMIT 100`
    )
    .bind(status)
    .all<{
      id: number; user_id: string; email: string; block_type: string;
      reason: string; status: string; admin_response: string | null;
      reviewed_by: string | null; reviewed_at: number | null;
      created_at: number; user_name: string | null;
    }>();

  return NextResponse.json({ appeals: appeals.results });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { reason, block_type = "full" } = await request.json();
  if (!reason?.trim() || reason.trim().length < 10) {
    return NextResponse.json({ error: "이의제기 사유를 10자 이상 입력하세요." }, { status: 400 });
  }

  // 이미 pending 이의제기가 있는지 확인
  const existing = await db
    .prepare("SELECT id FROM block_appeals WHERE user_id = ? AND status = 'pending' LIMIT 1")
    .bind(session.userId)
    .first();

  if (existing) {
    return NextResponse.json({ error: "이미 검토 중인 이의제기가 있습니다." }, { status: 409 });
  }

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(
    `INSERT INTO block_appeals (user_id, email, block_type, reason, status, created_at)
     VALUES ($1, $2, $3, $4, 'pending', $5)`,
    [session.userId, session.email, block_type, reason.trim(), Date.now()]
  );

  return NextResponse.json({ ok: true });
}
