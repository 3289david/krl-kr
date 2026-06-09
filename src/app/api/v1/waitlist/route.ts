import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId, generateSlug, isValidSlug } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const rows = await db.prepare(
    `SELECT w.*, (SELECT COUNT(*) FROM waitlist_signups s WHERE s.waitlist_id = w.id) AS signup_count
     FROM waitlists w WHERE w.user_id = ? ORDER BY w.created_at DESC`
  ).bind(auth.user.id).all();

  return NextResponse.json({ waitlists: rows.results ?? [] });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const { name, description, cta = "사전 등록하기", referral_enabled = 0, goal, launch_at } = body;
  let { slug } = body;

  if (!name?.trim()) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });

  if (slug?.trim()) {
    const { valid, reason } = isValidSlug(slug);
    if (!valid) return NextResponse.json({ error: reason }, { status: 400 });
    const existing = await db.prepare("SELECT id FROM waitlists WHERE slug = ?").bind(slug).first();
    if (existing) return NextResponse.json({ error: "이미 사용 중인 슬러그입니다." }, { status: 409 });
  } else {
    slug = generateSlug(8);
    let i = 0;
    while (i < 10) {
      if (!await db.prepare("SELECT id FROM waitlists WHERE slug = ?").bind(slug).first()) break;
      slug = generateSlug(8); i++;
    }
  }

  const id = generateId("wl");
  const now = Date.now();

  await db.prepare(
    `INSERT INTO waitlists (id, user_id, slug, name, description, cta, referral_enabled, is_open, goal, launch_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
  ).bind(id, auth.user.id, slug, name.trim(), description ?? null, cta, referral_enabled ? 1 : 0, goal ?? null, launch_at ? new Date(launch_at).getTime() : null, now, now).run();

  return NextResponse.json({ waitlist: { id, slug, name, description, cta, referral_enabled, is_open: 1, goal } }, { status: 201 });
}
