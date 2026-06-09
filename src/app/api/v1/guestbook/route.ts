import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId, generateSlug, isValidSlug } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const rows = await db.prepare(
    `SELECT g.*, (SELECT COUNT(*) FROM guestbook_entries e WHERE e.guestbook_id = g.id AND e.is_approved = 1) AS entry_count
     FROM guestbooks g WHERE g.user_id = ? ORDER BY g.created_at DESC`
  ).bind(auth.user.id).all();

  return NextResponse.json({ guestbooks: rows.results ?? [] });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const { name, description, allow_anonymous = 1, require_approval = 0, theme = "light" } = body;
  let { slug } = body;

  if (!name?.trim()) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });

  if (slug?.trim()) {
    const { valid, reason } = isValidSlug(slug);
    if (!valid) return NextResponse.json({ error: reason }, { status: 400 });
    const existing = await db.prepare("SELECT id FROM guestbooks WHERE slug = ?").bind(slug).first();
    if (existing) return NextResponse.json({ error: "이미 사용 중인 슬러그입니다." }, { status: 409 });
  } else {
    slug = generateSlug(8);
    let i = 0;
    while (i < 10) {
      if (!await db.prepare("SELECT id FROM guestbooks WHERE slug = ?").bind(slug).first()) break;
      slug = generateSlug(8); i++;
    }
  }

  const id = generateId("gb");
  const now = Date.now();

  await db.prepare(
    `INSERT INTO guestbooks (id, user_id, slug, name, description, allow_anonymous, require_approval, theme, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, auth.user.id, slug, name.trim(), description ?? null, allow_anonymous ? 1 : 0, require_approval ? 1 : 0, theme, now, now).run();

  return NextResponse.json({ guestbook: { id, slug, name, description, allow_anonymous, require_approval, theme } }, { status: 201 });
}
