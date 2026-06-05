import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const result = await pool.query(
      "SELECT * FROM drive_files WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

    return NextResponse.json({ file: result.rows[0] });
  } catch (err) {
    console.error("[drive/[id] GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const fileRow = await pool.query(
      "SELECT * FROM drive_files WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    if (!fileRow.rows[0]) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

    const body = await request.json();
    const { name, parent_id } = body;

    const result = await pool.query(
      `UPDATE drive_files SET
        name = COALESCE($1, name),
        parent_id = CASE WHEN $2::text IS NOT NULL THEN $2::integer ELSE parent_id END,
        updated_at = $3
       WHERE id = $4 AND user_id = $5 RETURNING *`,
      [name ?? null, parent_id !== undefined ? String(parent_id) : null, Date.now(), id, user.id]
    );
    return NextResponse.json({ file: result.rows[0] });
  } catch (err) {
    console.error("[drive/[id] PATCH]", err);
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

    const result = await pool.query(
      "DELETE FROM drive_files WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, user.id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

    const file = result.rows[0];
    if (file.storage_path && fs.existsSync(file.storage_path)) {
      fs.unlinkSync(file.storage_path);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[drive/[id] DELETE]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
