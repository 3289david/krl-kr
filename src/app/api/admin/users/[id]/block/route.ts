/**
 * POST   /api/admin/users/[id]/block   → 사용자 차단
 * DELETE /api/admin/users/[id]/block   → 차단 해제
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
  const { reason, expires_at, block_type = "full" } = await request.json();

  const user = await db
    .prepare("SELECT id, email FROM users WHERE id = ? LIMIT 1")
    .bind(id)
    .first<{ id: string; email: string }>();

  if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

  await db
    .prepare(
      `INSERT INTO user_blocks (user_id, email, reason, blocked_by, blocked_at, expires_at, block_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET reason = ?, blocked_by = ?, blocked_at = ?, expires_at = ?, block_type = ?`
    )
    .bind(
      user.id, user.email, reason ?? null, check.email, Date.now(), expires_at ?? null, block_type,
      reason ?? null, check.email, Date.now(), expires_at ?? null, block_type
    )
    .run();

  return NextResponse.json({ ok: true, email: user.email });
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
  await db.prepare("DELETE FROM user_blocks WHERE user_id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}
