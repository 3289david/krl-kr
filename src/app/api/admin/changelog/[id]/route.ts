import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id } = await params;
  const { version, title, content, type, published } = await request.json();

  try {
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    await pool.query(
      `UPDATE changelog_entries SET version=$1, title=$2, content=$3, type=$4, published=$5, updated_at=$6
       WHERE id=$7`,
      [version, title, content, type, published, Date.now(), id]
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Changelog update error:", e);
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id } = await params;

  try {
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    await pool.query(`DELETE FROM changelog_entries WHERE id=$1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Changelog delete error:", e);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
