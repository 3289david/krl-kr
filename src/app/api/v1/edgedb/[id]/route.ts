import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const store = await db.prepare("SELECT * FROM edgedb_stores WHERE id = ? AND user_id = ?").bind(id, auth.user.id).first() as Record<string, unknown> | null;
  if (!store) return NextResponse.json({ error: "존재하지 않는 스토어입니다." }, { status: 404 });

  const now = Date.now();
  const entries = await db.prepare(
    "SELECT key, value, type, expires_at, updated_at FROM edgedb_entries WHERE store_id = ? AND (expires_at IS NULL OR expires_at > ?) ORDER BY key ASC"
  ).bind(id, now).all();

  return NextResponse.json({ store, entries: entries.results ?? [] });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const store = await db.prepare("SELECT * FROM edgedb_stores WHERE id = ? AND user_id = ?").bind(id, auth.user.id).first() as Record<string, unknown> | null;
  if (!store) return NextResponse.json({ error: "존재하지 않는 스토어입니다." }, { status: 404 });

  await db.prepare("DELETE FROM edgedb_entries WHERE store_id = ?").bind(id).run();
  await db.prepare("DELETE FROM edgedb_stores WHERE id = ?").bind(id).run();

  return NextResponse.json({ ok: true });
}
