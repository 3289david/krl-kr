import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth, checkRateLimit } from "@/lib/auth";
import { generateId } from "@/lib/utils";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit({ key: `lp-fb:${slug}:${ip}`, limit: 3, windowMs: 3_600_000 });
  if (!rl.allowed) return NextResponse.json({ error: "너무 많은 요청입니다." }, { status: 429 });

  const project = await db.prepare("SELECT id FROM launchpad_projects WHERE slug = ? AND is_public = 1").bind(slug).first() as Record<string, unknown> | null;
  if (!project) return NextResponse.json({ error: "존재하지 않습니다." }, { status: 404 });

  const body = await request.json();
  if (!body.content?.trim() || body.content.trim().length < 5)
    return NextResponse.json({ error: "피드백을 5자 이상 입력해주세요." }, { status: 400 });

  const id = generateId("fb");
  const now = Date.now();

  await db.prepare(
    "INSERT INTO launchpad_feedback (id, project_id, author_name, author_email, type, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, project.id, body.author_name?.trim() ?? null, body.author_email?.trim() ?? null, body.type ?? "general", body.content.trim(), now).run();

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const project = await db.prepare("SELECT * FROM launchpad_projects WHERE slug = ? AND user_id = ?").bind(slug, auth.user.id).first() as Record<string, unknown> | null;
  if (!project) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const rows = await db.prepare("SELECT * FROM launchpad_feedback WHERE project_id = ? ORDER BY created_at DESC LIMIT 100").bind(project.id).all();
  return NextResponse.json({ feedback: rows.results ?? [] });
}
