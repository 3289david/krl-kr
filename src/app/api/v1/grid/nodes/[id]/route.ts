import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const node = await db.prepare("SELECT * FROM grid_nodes WHERE id = ? AND user_id = ?").bind(id, auth.user.id).first() as Record<string, unknown> | null;
  if (!node) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await request.json();
  const { status, available_from, available_to } = body;
  if (status && !["available", "busy", "offline"].includes(status)) return NextResponse.json({ error: "잘못된 상태값입니다." }, { status: 400 });

  await db.prepare(
    `UPDATE grid_nodes SET status = COALESCE(?, status), available_from = COALESCE(?, available_from),
     available_to = COALESCE(?, available_to), updated_at = ? WHERE id = ?`
  ).bind(status ?? null, available_from ?? null, available_to ?? null, Date.now(), id).run();

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const node = await db.prepare("SELECT * FROM grid_nodes WHERE id = ? AND user_id = ?").bind(id, auth.user.id).first() as Record<string, unknown> | null;
  if (!node) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  await db.prepare("DELETE FROM grid_nodes WHERE id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}
