import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const listing = await db.prepare("SELECT * FROM match_listings WHERE id = ? AND user_id = ?").bind(id, auth.user.id).first() as Record<string, unknown> | null;
  if (!listing) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await request.json();
  const { status } = body;
  if (!["active", "matched", "closed"].includes(status)) return NextResponse.json({ error: "잘못된 상태값입니다." }, { status: 400 });

  await db.prepare("UPDATE match_listings SET status = ?, updated_at = ? WHERE id = ?").bind(status, Date.now(), id).run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const listing = await db.prepare("SELECT * FROM match_listings WHERE id = ? AND user_id = ?").bind(id, auth.user.id).first() as Record<string, unknown> | null;
  if (!listing) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  await db.prepare("DELETE FROM match_listings WHERE id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}
