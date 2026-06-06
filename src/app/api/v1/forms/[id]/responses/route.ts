import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    // Verify ownership
    const form = await pool.query("SELECT id FROM krl_forms WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!form.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await pool.query("SELECT * FROM form_responses WHERE form_id = $1 ORDER BY created_at DESC", [id]);
    return NextResponse.json({ responses: result.rows });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { answers = {} } = body;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const form = await pool.query("SELECT id, is_public FROM krl_forms WHERE id = $1", [id]);
    if (!form.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await pool.query(
      "INSERT INTO form_responses (form_id, answers, created_at) VALUES ($1, $2, $3) RETURNING *",
      [id, JSON.stringify(answers), Date.now()]
    );
    return NextResponse.json({ response: result.rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
