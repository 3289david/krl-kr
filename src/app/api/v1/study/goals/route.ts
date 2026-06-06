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
    const result = await pool.query("SELECT * FROM study_goals WHERE user_id = $1 ORDER BY created_at DESC", [user.id]);
    return NextResponse.json({ goals: result.rows });
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
    const { title, subject, target_minutes, deadline = null } = body;
    if (!title || !subject || !target_minutes) {
      return NextResponse.json({ error: "제목, 과목, 목표 시간이 필요합니다." }, { status: 400 });
    }

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const result = await pool.query(
      "INSERT INTO study_goals (user_id, title, subject, target_minutes, current_minutes, deadline, completed, created_at) VALUES ($1, $2, $3, $4, 0, $5, FALSE, $6) RETURNING *",
      [user.id, title, subject, target_minutes, deadline, Date.now()]
    );
    return NextResponse.json({ goal: result.rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
