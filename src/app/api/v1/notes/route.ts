import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const folder_id = searchParams.get("folder_id");
    const tag = searchParams.get("tag");
    const q = searchParams.get("q");
    const pinned = searchParams.get("pinned");

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    let sql = "SELECT * FROM notes WHERE user_id = $1";
    const params: unknown[] = [user.id];
    let idx = 2;

    if (folder_id) { sql += ` AND folder_id = $${idx++}`; params.push(folder_id); }
    if (pinned === "true") { sql += ` AND is_pinned = TRUE`; }
    if (q) { sql += ` AND (title ILIKE $${idx} OR content ILIKE $${idx})`; params.push(`%${q}%`); idx++; }
    if (tag) { sql += ` AND $${idx} = ANY(tags)`; params.push(tag); idx++; }
    sql += " ORDER BY is_pinned DESC, updated_at DESC";

    const result = await pool.query(sql, params);
    return NextResponse.json({ notes: result.rows });
  } catch (err) {
    console.error("[notes GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { title = "제목 없음", content = "", folder_id = null, tags = [] } = body;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const now = Date.now();

    const result = await pool.query(
      `INSERT INTO notes (user_id, title, content, folder_id, tags, is_pinned, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, FALSE, $6, $6) RETURNING *`,
      [user.id, title, content, folder_id, tags, now]
    );
    return NextResponse.json({ note: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[notes POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
