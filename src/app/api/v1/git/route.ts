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
    const result = await pool.query("SELECT * FROM git_repos WHERE user_id = $1 ORDER BY updated_at DESC", [user.id]);
    return NextResponse.json({ repos: result.rows });
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
    const { name, description = "", is_public = false } = body;
    if (!name) return NextResponse.json({ error: "저장소 이름이 필요합니다." }, { status: 400 });

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const now = Date.now();
    const result = await pool.query(
      "INSERT INTO git_repos (user_id, name, description, is_public, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $5) RETURNING *",
      [user.id, name, description, is_public, now]
    );
    return NextResponse.json({ repo: result.rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
