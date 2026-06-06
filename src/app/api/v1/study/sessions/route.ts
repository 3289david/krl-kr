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
    const result = await pool.query("SELECT * FROM study_sessions WHERE user_id = $1 ORDER BY started_at DESC", [user.id]);
    return NextResponse.json({ sessions: result.rows });
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
    const { subject, duration, started_at, ended_at, notes = "" } = body;
    if (!subject || !duration || !started_at) {
      return NextResponse.json({ error: "과목, 시간, 시작 시간이 필요합니다." }, { status: 400 });
    }

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const result = await pool.query(
      "INSERT INTO study_sessions (user_id, subject, duration, started_at, ended_at, notes, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [user.id, subject, duration, started_at, ended_at, notes, Date.now()]
    );
    return NextResponse.json({ session: result.rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
