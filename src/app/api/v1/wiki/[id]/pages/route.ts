import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const wiki = await pool.query("SELECT id FROM wikis WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!wiki.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await pool.query("SELECT * FROM wiki_pages WHERE wiki_id = $1 ORDER BY title", [id]);
    return NextResponse.json({ pages: result.rows });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { slug, title, content = "", parent_id = null } = body;
    if (!slug || !title) return NextResponse.json({ error: "슬러그와 제목이 필요합니다." }, { status: 400 });

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const wiki = await pool.query("SELECT id FROM wikis WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!wiki.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = Date.now();
    const result = await pool.query(
      "INSERT INTO wiki_pages (wiki_id, slug, title, content, parent_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING *",
      [id, slug, title, content, parent_id, now]
    );
    return NextResponse.json({ page: result.rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
