import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

type Ctx = { params: Promise<{ offerId: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { offerId } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const offer = await db.prepare(`
    SELECT o.*, l.user_id AS owner_id FROM swap_offers o
    JOIN swap_listings l ON l.id = o.listing_id
    WHERE o.id = ?
  `).bind(offerId).first() as Record<string, unknown> | null;

  if (!offer) return NextResponse.json({ error: "제안을 찾을 수 없습니다." }, { status: 404 });
  if (offer.owner_id !== auth.user.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await request.json();
  const { status } = body;
  if (!["accepted", "rejected"].includes(status)) return NextResponse.json({ error: "잘못된 상태값입니다." }, { status: 400 });

  await db.prepare("UPDATE swap_offers SET status = ? WHERE id = ?").bind(status, offerId).run();

  if (status === "accepted") {
    await db.prepare("UPDATE swap_listings SET status = 'matched' WHERE id = ?").bind(offer.listing_id).run();
    await db.prepare("UPDATE swap_offers SET status = 'rejected' WHERE listing_id = ? AND id != ?").bind(offer.listing_id, offerId).run();
  }

  return NextResponse.json({ ok: true });
}
