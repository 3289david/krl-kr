import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

// PATCH /api/v1/ghost/[id] — update box settings
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;
    const pool = await getPool();

    const owner = await pool.query("SELECT 1 FROM ghost_boxes WHERE id=$1 AND user_id=$2", [id, user.id]);
    if (!owner.rows[0]) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

    const body = await request.json();
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (body.title !== undefined) { sets.push(`title=$${idx++}`); vals.push(body.title.trim().slice(0, 80)); }
    if (body.description !== undefined) { sets.push(`description=$${idx++}`); vals.push(body.description.trim().slice(0, 300)); }
    if (body.isActive !== undefined) { sets.push(`is_active=$${idx++}`); vals.push(!!body.isActive); }
    if (!sets.length) return NextResponse.json({ ok: true });

    vals.push(id);
    await pool.query(`UPDATE ghost_boxes SET ${sets.join(",")} WHERE id=$${idx}`, vals);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ghost PATCH]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// DELETE /api/v1/ghost/[id] — delete box
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;
    const pool = await getPool();
    await pool.query("DELETE FROM ghost_boxes WHERE id=$1 AND user_id=$2", [id, user.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
