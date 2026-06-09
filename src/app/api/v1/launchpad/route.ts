import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId, generateSlug, isValidSlug } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const rows = await db.prepare("SELECT * FROM launchpad_projects WHERE user_id = ? ORDER BY created_at DESC").bind(auth.user.id).all();
  return NextResponse.json({ projects: rows.results ?? [] });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const { name, tagline, description, status = "building", website_url, github_url, twitter_url, logo_text, accent_color = "#6366f1", is_public = 1, contact_email } = body;
  let { slug } = body;

  if (!name?.trim()) return NextResponse.json({ error: "프로젝트 이름을 입력해주세요." }, { status: 400 });

  if (slug?.trim()) {
    const { valid, reason } = isValidSlug(slug);
    if (!valid) return NextResponse.json({ error: reason }, { status: 400 });
    const ex = await db.prepare("SELECT id FROM launchpad_projects WHERE slug = ?").bind(slug).first();
    if (ex) return NextResponse.json({ error: "이미 사용 중인 슬러그입니다." }, { status: 409 });
  } else {
    slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || generateSlug(8);
    slug = slug.slice(0, 40);
    let i = 0;
    while (i < 10) {
      if (!await db.prepare("SELECT id FROM launchpad_projects WHERE slug = ?").bind(slug).first()) break;
      slug = slug.slice(0, 35) + "-" + generateSlug(4); i++;
    }
  }

  const id = generateId("lp");
  const now = Date.now();

  await db.prepare(
    `INSERT INTO launchpad_projects (id, user_id, slug, name, tagline, description, status, website_url, github_url, twitter_url, logo_text, accent_color, is_public, contact_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, auth.user.id, slug, name.trim(), tagline ?? null, description ?? null, status, website_url ?? null, github_url ?? null, twitter_url ?? null, logo_text ?? null, accent_color, is_public ? 1 : 0, contact_email ?? null, now, now).run();

  return NextResponse.json({ project: { id, slug, name, tagline, status } }, { status: 201 });
}
