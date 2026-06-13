import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const listing = await db.prepare("SELECT * FROM swap_listings WHERE (id = ? OR slug = ?) AND status = 'open'").bind(id, id).first() as Record<string, unknown> | null;
  if (!listing) return NextResponse.json({ error: "교환 글을 찾을 수 없거나 이미 마감됐습니다." }, { status: 404 });
  if (listing.user_id === auth.user.id) return NextResponse.json({ error: "자신의 교환 글에는 제안할 수 없습니다." }, { status: 400 });

  const body = await request.json();
  const { offer_title, offer_description } = body;
  if (!offer_title?.trim()) return NextResponse.json({ error: "제안 제목을 입력해주세요." }, { status: 400 });

  const offerId = generateId("ofe");
  const now = Date.now();

  await db.prepare(
    `INSERT INTO swap_offers (id, listing_id, from_user_id, from_username, offer_title, offer_description, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).bind(offerId, listing.id, auth.user.id, auth.user.username ?? null, offer_title.trim(), offer_description ?? null, now).run();

  return NextResponse.json({ ok: true, id: offerId }, { status: 201 });
}
