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
    const result = await pool.query("SELECT * FROM krl_docs WHERE user_id = $1 ORDER BY updated_at DESC", [user.id]);
    return NextResponse.json({ docs: result.rows });
  } catch (err) {
    console.error("[docs GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { title = "제목 없음" } = body;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const now = Date.now();
    const result = await pool.query(
      "INSERT INTO krl_docs (user_id, title, content, is_public, created_at, updated_at) VALUES ($1, $2, '', FALSE, $3, $3) RETURNING *",
      [user.id, title, now]
    );
    return NextResponse.json({ doc: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[docs POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
