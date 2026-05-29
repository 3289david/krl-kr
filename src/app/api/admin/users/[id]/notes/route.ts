/** GET/POST /api/admin/users/[id]/notes — 관리자 메모 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id } = await params;
  const { note } = await request.json();
  if (!note?.trim()) return NextResponse.json({ error: "메모를 입력하세요." }, { status: 400 });

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(
    `INSERT INTO user_notes (user_id, admin_email, note, created_at) VALUES ($1, $2, $3, $4)`,
    [id, check.email, note.trim(), Date.now()]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const noteId = searchParams.get("noteId");
  if (!noteId) return NextResponse.json({ error: "noteId 필요" }, { status: 400 });

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(`DELETE FROM user_notes WHERE id = $1 AND user_id = $2`, [noteId, id]);
  return NextResponse.json({ ok: true });
}
