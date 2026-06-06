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
    const result = await pool.query("SELECT * FROM box_items WHERE user_id = $1 ORDER BY archived_at DESC", [user.id]);
    return NextResponse.json({ items: result.rows });
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
    const { file_key, original_name, file_size, mime_type, notes = "" } = body;
    if (!file_key || !original_name) {
      return NextResponse.json({ error: "파일 키와 이름이 필요합니다." }, { status: 400 });
    }

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const now = Date.now();
    const result = await pool.query(
      "INSERT INTO box_items (user_id, file_key, original_name, file_size, mime_type, notes, archived_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [user.id, file_key, original_name, file_size ?? 0, mime_type ?? "application/octet-stream", notes, now]
    );
    return NextResponse.json({ item: result.rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
