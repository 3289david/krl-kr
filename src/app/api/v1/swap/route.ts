import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId, generateSlug } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const category = request.nextUrl.searchParams.get("category") ?? "";
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const mine = request.nextUrl.searchParams.get("mine") === "1";
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1"));
  const limit = 20;
  const offset = (page - 1) * limit;

  if (mine) {
    const auth = await requireAuth(db, request);
    if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    const rows = await db.prepare(
      "SELECT * FROM swap_listings WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).bind(auth.user.id, limit, offset).all();
    return NextResponse.json({ listings: rows.results ?? [] });
  }

  const myoffers = request.nextUrl.searchParams.get("myoffers") === "1";
  if (myoffers) {
    const auth = await requireAuth(db, request);
    if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    const rows = await db.prepare(
      `SELECT o.*, l.title AS listing_title, l.slug AS listing_slug, l.status AS listing_status, l.want_for
       FROM swap_offers o JOIN swap_listings l ON l.id = o.listing_id
       WHERE o.from_user_id = ? ORDER BY o.created_at DESC LIMIT ? OFFSET ?`
    ).bind(auth.user.id, limit, offset).all();
    return NextResponse.json({ offers: rows.results ?? [] });
  }

  let sql = "SELECT * FROM swap_listings WHERE status = 'open'";
  const binds: unknown[] = [];
  if (category) { sql += " AND category = ?"; binds.push(category); }
  if (q) { sql += " AND (title ILIKE ? OR description ILIKE ? OR want_for ILIKE ?)"; binds.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  binds.push(limit, offset);

  const rows = await db.prepare(sql).bind(...binds).all();
  return NextResponse.json({ listings: rows.results ?? [], page, limit });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const { title, description, category, want_for, image_url } = body;

  if (!title?.trim()) return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
  if (!want_for?.trim()) return NextResponse.json({ error: "원하는 교환 물품을 입력해주세요." }, { status: 400 });

  let slug = generateSlug(8);
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.prepare("SELECT id FROM swap_listings WHERE slug = ?").bind(slug).first();
    if (!existing) break;
    slug = generateSlug(8);
    attempts++;
  }

  const id = generateId("swp");
  const now = Date.now();

  await db.prepare(
    `INSERT INTO swap_listings (id, user_id, slug, title, description, category, want_for, image_url, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`
  ).bind(id, auth.user.id, slug, title.trim(), description ?? null, category ?? null, want_for.trim(), image_url ?? null, now, now).run();

  return NextResponse.json({ listing: { id, slug, title: title.trim(), description, category, want_for: want_for.trim(), image_url, status: "open", created_at: now } }, { status: 201 });
}
