/**
 * PATCH  /api/admin/notices/[id]  → 공지 수정
 * DELETE /api/admin/notices/[id]  → 공지 삭제
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id } = await params;
  const body = await request.json();
  const allowed = ["title", "content", "notice_type", "pinned", "popup", "popup_expires_at", "visible"];
  const fields = Object.entries(body)
    .filter(([k]) => allowed.includes(k))
    .map(([k]) => `${k} = ?`);
  const vals = Object.entries(body)
    .filter(([k]) => allowed.includes(k))
    .map(([, v]) => v);

  if (fields.length === 0) return NextResponse.json({ error: "수정할 항목이 없습니다." }, { status: 400 });

  await db
    .prepare(`UPDATE notices SET ${fields.join(", ")}, updated_at = ? WHERE id = ?`)
    .bind(...vals, Date.now(), Number(id))
    .run();

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
  await db.prepare("DELETE FROM notices WHERE id = ?").bind(Number(id)).run();
  return NextResponse.json({ ok: true });
}
