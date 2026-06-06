import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const result = await pool.query("SELECT * FROM krl_forms WHERE id = $1", [id]);
    const form = result.rows[0];
    if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Check auth for owner access
    const { user } = await requireAuth(db, request);
    if (user) {
      if (form.user_id === user.id) return NextResponse.json({ form });
    }
    // Public access
    if (form.is_public) return NextResponse.json({ form: { ...form, questions: form.questions } });
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const key of ["title", "description", "is_public"]) {
      if (key in body) { fields.push(`${key} = $${idx++}`); values.push(body[key]); }
    }
    if ("questions" in body) { fields.push(`questions = $${idx++}`); values.push(JSON.stringify(body.questions)); }
    fields.push(`updated_at = $${idx++}`);
    values.push(Date.now());
    values.push(id);
    values.push(user.id);

    const result = await pool.query(
      `UPDATE krl_forms SET ${fields.join(", ")} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values
    );
    if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ form: result.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    await pool.query("DELETE FROM krl_forms WHERE id = $1 AND user_id = $2", [id, user.id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
