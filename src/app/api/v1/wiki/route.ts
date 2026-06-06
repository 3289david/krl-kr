import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const result = await pool.query("SELECT * FROM wikis WHERE user_id = $1 ORDER BY created_at DESC", [user.id]);
    return NextResponse.json({ wikis: result.rows });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { slug, name, description = "", is_public = false } = body;
    if (!slug || !name) return NextResponse.json({ error: "슬러그와 이름이 필요합니다." }, { status: 400 });

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const now = Date.now();
    const result = await pool.query(
      "INSERT INTO wikis (user_id, slug, name, description, is_public, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [user.id, slug, name, description, is_public, now]
    );
    return NextResponse.json({ wiki: result.rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
