import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId, generateSlug, isValidSlug } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const rows = await db.prepare(
    "SELECT * FROM countdowns WHERE user_id = ? ORDER BY created_at DESC"
  ).bind(auth.user.id).all();

  return NextResponse.json({ countdowns: rows.results ?? [] });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const { title, description, target_at, theme = "minimal", is_public = 1 } = body;

  if (!title?.trim()) return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
  if (!target_at) return NextResponse.json({ error: "목표 날짜를 입력해주세요." }, { status: 400 });

  let slug = body.slug?.trim();
  if (slug) {
    const { valid, reason } = isValidSlug(slug);
    if (!valid) return NextResponse.json({ error: reason }, { status: 400 });
    const existing = await db.prepare("SELECT id FROM countdowns WHERE slug = ?").bind(slug).first();
    if (existing) return NextResponse.json({ error: "이미 사용 중인 슬러그입니다." }, { status: 409 });
  } else {
    slug = generateSlug(8);
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.prepare("SELECT id FROM countdowns WHERE slug = ?").bind(slug).first();
      if (!existing) break;
      slug = generateSlug(8);
      attempts++;
    }
  }

  const id = generateId("cd");
  const now = Date.now();
  const targetMs = new Date(target_at).getTime();
  if (isNaN(targetMs)) return NextResponse.json({ error: "잘못된 날짜 형식입니다." }, { status: 400 });

  await db.prepare(
    `INSERT INTO countdowns (id, user_id, slug, title, description, target_at, theme, is_public, view_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
  ).bind(id, auth.user.id, slug, title.trim(), description ?? null, targetMs, theme, is_public ? 1 : 0, now, now).run();

  return NextResponse.json({ countdown: { id, slug, title, description, target_at: targetMs, theme, is_public, view_count: 0 } }, { status: 201 });
}
