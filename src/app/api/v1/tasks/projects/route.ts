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
    const result = await pool.query("SELECT * FROM task_projects WHERE user_id = $1 ORDER BY name", [user.id]);
    return NextResponse.json({ projects: result.rows });
  } catch (err) {
    console.error("[task projects GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { name, color = "#6366f1", description = "" } = body;
    if (!name) return NextResponse.json({ error: "이름이 필요합니다." }, { status: 400 });

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const now = Date.now();
    const result = await pool.query(
      "INSERT INTO task_projects (user_id, name, color, description, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [user.id, name, color, description, now]
    );
    return NextResponse.json({ project: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[task projects POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
