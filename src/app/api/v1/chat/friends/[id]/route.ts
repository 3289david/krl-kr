import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

// PATCH: accept or decline request
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { action } = await request.json();
    const pool = await getPool();

    const r = await pool.query(
      "SELECT * FROM friendships WHERE id=$1 AND addressee_id=$2 AND status='pending'",
      [id, user.id]
    );
    if (!r.rows[0]) return NextResponse.json({ error: "없음" }, { status: 404 });

    if (action === "accept") {
      await pool.query(
        "UPDATE friendships SET status='accepted', updated_at=$1 WHERE id=$2",
        [Date.now(), id]
      );
      return NextResponse.json({ ok: true });
    }
    if (action === "decline") {
      await pool.query("DELETE FROM friendships WHERE id=$1", [id]);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "잘못된 action" }, { status: 400 });
  } catch (err) {
    console.error("[friends/:id PATCH]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// DELETE: remove friend
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    await pool.query(
      `DELETE FROM friendships
       WHERE id=$1 AND (requester_id=$2 OR addressee_id=$2)`,
      [id, user.id]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[friends/:id DELETE]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
