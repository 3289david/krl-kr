import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { getPool } from "@/lib/db/postgres";
import fs from "fs";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const res = await pool.query(
      "SELECT * FROM workspaces WHERE id=$1 AND user_id=$2",
      [id, user.id]
    );
    if (!res.rows.length) return NextResponse.json({ error: "워크스페이스를 찾을 수 없습니다." }, { status: 404 });

    return NextResponse.json({ workspace: res.rows[0] });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const pool = await getPool();
    const now = Date.now();

    const res = await pool.query(
      "SELECT id FROM workspaces WHERE id=$1 AND user_id=$2 AND status!='deleted'",
      [id, user.id]
    );
    if (!res.rows.length) return NextResponse.json({ error: "워크스페이스를 찾을 수 없습니다." }, { status: 404 });

    const fields: string[] = [];
    const vals: unknown[] = [];
    if (body.name) { fields.push(`name=$${vals.length + 1}`); vals.push(body.name); }
    if (body.description !== undefined) { fields.push(`description=$${vals.length + 1}`); vals.push(body.description); }

    if (fields.length) {
      fields.push(`updated_at=$${vals.length + 1}`);
      vals.push(now);
      vals.push(id);
      await pool.query(`UPDATE workspaces SET ${fields.join(",")} WHERE id=$${vals.length}`, vals);
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const res = await pool.query(
      "SELECT dir_path FROM workspaces WHERE id=$1 AND user_id=$2",
      [id, user.id]
    );
    if (!res.rows.length) return NextResponse.json({ error: "워크스페이스를 찾을 수 없습니다." }, { status: 404 });

    const dirPath = res.rows[0].dir_path;

    // Delete sessions first
    await pool.query("DELETE FROM workspace_sessions WHERE workspace_id=$1", [id]);
    // Mark deleted
    await pool.query("UPDATE workspaces SET status='deleted', updated_at=$1 WHERE id=$2", [Date.now(), id]);

    // Remove directory in background
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
