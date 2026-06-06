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
    const project_id = searchParams.get("project_id");
    const status = searchParams.get("status");

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    let sql = "SELECT * FROM tasks WHERE user_id = $1";
    const params: unknown[] = [user.id];
    let idx = 2;
    if (project_id) { sql += ` AND project_id = $${idx++}`; params.push(project_id); }
    if (status) { sql += ` AND status = $${idx++}`; params.push(status); }
    sql += " ORDER BY created_at DESC";

    const result = await pool.query(sql, params);
    return NextResponse.json({ tasks: result.rows });
  } catch (err) {
    console.error("[tasks GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { title, description = "", project_id = null, priority = "medium", due_date = null } = body;
    if (!title) return NextResponse.json({ error: "제목이 필요합니다." }, { status: 400 });

    const due_date_ms = due_date
      ? (typeof due_date === "string" && /^\d{4}-\d{2}-\d{2}/.test(due_date)
          ? new Date(due_date).getTime()
          : Number(due_date))
      : null;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const now = Date.now();
    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, description, project_id, priority, status, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'todo', $6, $7, $7) RETURNING *`,
      [user.id, title, description, project_id, priority, due_date_ms, now]
    );
    return NextResponse.json({ task: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[tasks POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
