import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getDB(request);

  const listing = await db.prepare("SELECT * FROM swap_listings WHERE id = ? OR slug = ?").bind(id, id).first() as Record<string, unknown> | null;
  if (!listing) return NextResponse.json({ error: "존재하지 않는 교환 글입니다." }, { status: 404 });

  const offers = await db.prepare(
    "SELECT * FROM swap_offers WHERE listing_id = ? ORDER BY created_at DESC"
  ).bind(listing.id).all();

  return NextResponse.json({ listing, offers: offers.results ?? [] });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const listing = await db.prepare("SELECT * FROM swap_listings WHERE (id = ? OR slug = ?) AND user_id = ?").bind(id, id, auth.user.id).first() as Record<string, unknown> | null;
  if (!listing) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await request.json();
  const { status, title, description, want_for } = body;

  await db.prepare(
    `UPDATE swap_listings SET status = COALESCE(?, status), title = COALESCE(?, title),
     description = COALESCE(?, description), want_for = COALESCE(?, want_for), updated_at = ? WHERE id = ?`
  ).bind(status ?? null, title ?? null, description ?? null, want_for ?? null, Date.now(), listing.id).run();

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const listing = await db.prepare("SELECT * FROM swap_listings WHERE (id = ? OR slug = ?) AND user_id = ?").bind(id, id, auth.user.id).first() as Record<string, unknown> | null;
  if (!listing) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  await db.prepare("DELETE FROM swap_offers WHERE listing_id = ?").bind(listing.id).run();
  await db.prepare("DELETE FROM swap_listings WHERE id = ?").bind(listing.id).run();

  return NextResponse.json({ ok: true });
}
