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
    const result = await pool.query("SELECT * FROM whiteboards WHERE user_id = $1 ORDER BY updated_at DESC", [user.id]);
    return NextResponse.json({ whiteboards: result.rows });
  } catch (err) {
    console.error("[whiteboard GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { name = "새 화이트보드" } = body;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const now = Date.now();
    const result = await pool.query(
      "INSERT INTO whiteboards (user_id, name, data, created_at, updated_at) VALUES ($1, $2, '{}', $3, $3) RETURNING *",
      [user.id, name, now]
    );
    return NextResponse.json({ whiteboard: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[whiteboard POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
