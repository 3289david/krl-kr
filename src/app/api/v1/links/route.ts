import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;
  const search = searchParams.get("q") ?? "";

  let links;
  let total: number;

  if (search) {
    const pattern = `%${search}%`;
    const result = await db
      .prepare(
        `SELECT * FROM links WHERE user_id = ? AND (slug LIKE ? OR original_url LIKE ? OR title LIKE ?)
         ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(user.id, pattern, pattern, pattern, limit, offset)
      .all<Record<string, unknown>>();
    links = result.results;

    const countResult = await db
      .prepare(
        `SELECT COUNT(*) as count FROM links WHERE user_id = ? AND (slug LIKE ? OR original_url LIKE ? OR title LIKE ?)`
      )
      .bind(user.id, pattern, pattern, pattern)
      .first<{ count: number }>();
    total = countResult?.count ?? 0;
  } else {
    const result = await db
      .prepare("SELECT * FROM links WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .bind(user.id, limit, offset)
      .all<Record<string, unknown>>();
    links = result.results;

    const countResult = await db
      .prepare("SELECT COUNT(*) as count FROM links WHERE user_id = ?")
      .bind(user.id)
      .first<{ count: number }>();
    total = countResult?.count ?? 0;
  }

  return NextResponse.json({
    links,
    total,
    page,
    pages: Math.ceil(total / limit),
    limit,
  });
}
