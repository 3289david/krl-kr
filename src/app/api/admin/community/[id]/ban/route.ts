/**
 * POST   /api/admin/community/[id]/ban   → 커뮤니티 차단
 * DELETE /api/admin/community/[id]/ban   → 차단 해제
 */
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
  const { reason, expires_at } = await request.json();

  const user = await db
    .prepare("SELECT id, email FROM users WHERE id = ? LIMIT 1")
    .bind(id)
    .first<{ id: string; email: string }>();

  if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

  await db
    .prepare(
      `INSERT INTO community_bans (user_id, email, reason, banned_by, banned_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET reason = ?, banned_by = ?, banned_at = ?, expires_at = ?`
    )
    .bind(
      user.id, user.email, reason ?? null, check.email, Date.now(), expires_at ?? null,
      reason ?? null, check.email, Date.now(), expires_at ?? null
    )
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
  await db.prepare("DELETE FROM community_bans WHERE user_id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}
