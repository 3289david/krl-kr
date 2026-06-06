import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const allowed = ["label", "product", "max_activations", "expires_at", "active"];
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const key of allowed) {
      if (key in body) {
        fields.push(`${key} = $${idx++}`);
        values.push(body[key]);
      }
    }
    if (!fields.length) return NextResponse.json({ error: "변경할 항목 없음" }, { status: 400 });
    values.push(id, user.id);

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const result = await pool.query(
      `UPDATE license_keys SET ${fields.join(", ")} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
      values
    );
    if (!result.rows[0]) return NextResponse.json({ error: "찾을 수 없음" }, { status: 404 });
    return NextResponse.json({ key: result.rows[0] });
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
    await pool.query("DELETE FROM license_keys WHERE id = $1 AND user_id = $2", [id, user.id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
