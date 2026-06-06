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
    const result = await pool.query(
      "SELECT id, type, name, username, encrypted_data, iv, url, notes, created_at, updated_at FROM vault_items WHERE user_id = $1 ORDER BY name",
      [user.id]
    );
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
    const { type = "password", name, username = "", encrypted_data, iv, url = "", notes = "" } = body;
    if (!name || !encrypted_data || !iv) {
      return NextResponse.json({ error: "이름, 암호화된 데이터, IV가 필요합니다." }, { status: 400 });
    }

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const now = Date.now();
    const result = await pool.query(
      "INSERT INTO vault_items (user_id, type, name, username, encrypted_data, iv, url, notes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) RETURNING *",
      [user.id, type, name, username, encrypted_data, iv, url, notes, now]
    );
    return NextResponse.json({ item: result.rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
