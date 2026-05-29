/**
 * GET /api/admin/users?q=&page=&limit=
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
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));
  const offset = (page - 1) * limit;

  const whereClause = q
    ? `WHERE (u.email ILIKE $1 OR u.name ILIKE $1)`
    : "";
  const bindings = q ? [`%${q}%`] : [];

  // Use raw pool for complex query
  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  const countSql = `SELECT COUNT(*) as count FROM users u ${whereClause}`;
  const listSql = `
    SELECT u.id, u.email, u.name, u.plan, u.verified, u.created_at,
      (SELECT COUNT(*) FROM links WHERE user_id = u.id) as link_count,
      (SELECT COUNT(*) FROM email_aliases WHERE user_id = u.id) as email_count,
      EXISTS(SELECT 1 FROM user_blocks WHERE user_id = u.id AND (expires_at IS NULL OR expires_at > ${Date.now()})) as is_blocked,
      EXISTS(SELECT 1 FROM community_bans WHERE user_id = u.id AND (expires_at IS NULL OR expires_at > ${Date.now()})) as is_community_banned,
      EXISTS(SELECT 1 FROM admins WHERE user_id = u.id) as is_admin
    FROM users u
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [countResult, listResult] = await Promise.all([
    pool.query(countSql, bindings),
    pool.query(listSql, bindings),
  ]);

  return NextResponse.json({
    users: listResult.rows,
    total: Number(countResult.rows[0]?.count ?? 0),
    page,
    limit,
  });
}
