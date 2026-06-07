import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import fs from "fs";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB(request);
  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  const r = await pool.query("SELECT * FROM drive_files WHERE id=$1 AND user_id=$2", [id, user.id]);
  if (!r.rows[0]) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ file: r.rows[0] });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB(request);
  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  const body = await request.json() as Record<string, unknown>;
  const { name, parent_id, is_starred, action } = body;

  // Restore from trash
  if (action === "restore") {
    const r = await pool.query(
      "UPDATE drive_files SET deleted_at=NULL, updated_at=$1 WHERE id=$2 AND user_id=$3 RETURNING *",
      [Date.now(), id, user.id]
    );
    return NextResponse.json({ file: r.rows[0] });
  }

  const sets: string[] = ["updated_at=$1"];
  const vals: unknown[] = [Date.now()];
  let i = 2;
  if (name !== undefined) { sets.push(`name=$${i++}`); vals.push(name); }
  if (parent_id !== undefined) { sets.push(`parent_id=$${i++}`); vals.push(parent_id === null ? null : Number(parent_id)); }
  if (is_starred !== undefined) { sets.push(`is_starred=$${i++}`); vals.push(Boolean(is_starred)); }

  vals.push(id, user.id);
  const r = await pool.query(
    `UPDATE drive_files SET ${sets.join(",")} WHERE id=$${i++} AND user_id=$${i} RETURNING *`,
    vals
  );
  if (!r.rows[0]) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ file: r.rows[0] });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB(request);
  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  const { searchParams } = new URL(request.url);
  const permanent = searchParams.get("permanent") === "1";

  const r = await pool.query("SELECT * FROM drive_files WHERE id=$1 AND user_id=$2", [id, user.id]);
  if (!r.rows[0]) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  const file = r.rows[0];

  if (permanent || file.deleted_at) {
    // Permanent delete — remove file from disk
    if (file.storage_path && fs.existsSync(file.storage_path)) fs.unlinkSync(file.storage_path);
    await pool.query("DELETE FROM drive_files WHERE id=$1 AND user_id=$2", [id, user.id]);
  } else {
    // Move to trash
    await pool.query("UPDATE drive_files SET deleted_at=$1 WHERE id=$2 AND user_id=$3", [Date.now(), id, user.id]);
  }

  return NextResponse.json({ success: true });
}
