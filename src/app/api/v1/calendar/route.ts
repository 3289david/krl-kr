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
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const calendar_id = searchParams.get("calendar_id");

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    let sql = "SELECT * FROM calendar_events WHERE user_id = $1";
    const params: unknown[] = [user.id];
    let idx = 2;
    if (start) { sql += ` AND end_at >= $${idx++}`; params.push(Number(start)); }
    if (end) { sql += ` AND start_at <= $${idx++}`; params.push(Number(end)); }
    if (calendar_id) { sql += ` AND calendar_id = $${idx++}`; params.push(calendar_id); }
    sql += " ORDER BY start_at ASC";

    const result = await pool.query(sql, params);
    return NextResponse.json({ events: result.rows });
  } catch (err) {
    console.error("[calendar GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { title, description = "", location = "", start_at, end_at, all_day = false, color = "#6366f1", calendar_id = null } = body;
    if (!title || !start_at) return NextResponse.json({ error: "제목과 시작 시간이 필요합니다." }, { status: 400 });

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const now = Date.now();
    const result = await pool.query(
      `INSERT INTO calendar_events (user_id, title, description, location, start_at, end_at, all_day, color, calendar_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10) RETURNING *`,
      [user.id, title, description, location, start_at, end_at ?? start_at, all_day, color, calendar_id, now]
    );
    return NextResponse.json({ event: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[calendar POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
