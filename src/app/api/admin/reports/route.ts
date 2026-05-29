/** GET /api/admin/reports — 신고 목록 (관리자) */
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

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM user_reports WHERE status = $1 ORDER BY created_at DESC LIMIT 200`,
    [status]
  );
  const count = await pool.query(`SELECT COUNT(*) FROM user_reports WHERE status = 'pending'`);

  return NextResponse.json({ reports: result.rows, pendingCount: Number(count.rows[0].count) });
}
