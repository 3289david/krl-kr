/** GET /api/admin/log — 관리자 활동 로그 */
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

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM admin_log ORDER BY created_at DESC LIMIT 200`
  );
  return NextResponse.json({ logs: result.rows });
}
