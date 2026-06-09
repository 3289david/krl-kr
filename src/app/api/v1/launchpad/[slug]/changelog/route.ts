import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId } from "@/lib/utils";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);

  const project = await db.prepare("SELECT id FROM launchpad_projects WHERE slug = ?").bind(slug).first() as Record<string, unknown> | null;
  if (!project) return NextResponse.json({ error: "존재하지 않습니다." }, { status: 404 });

  const rows = await db.prepare("SELECT * FROM launchpad_changelog WHERE project_id = ? ORDER BY created_at DESC").bind(project.id).all();
  return NextResponse.json({ changelog: rows.results ?? [] });
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const project = await db.prepare("SELECT * FROM launchpad_projects WHERE slug = ? AND user_id = ?").bind(slug, auth.user.id).first() as Record<string, unknown> | null;
  if (!project) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await request.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
  if (!body.content?.trim()) return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });

  const id = generateId("cl");
  const now = Date.now();

  await db.prepare(
    "INSERT INTO launchpad_changelog (id, project_id, version, title, content, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(id, project.id, body.version ?? null, body.title.trim(), body.content.trim(), now).run();

  return NextResponse.json({ entry: { id, version: body.version, title: body.title, content: body.content, created_at: now } }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const project = await db.prepare("SELECT * FROM launchpad_projects WHERE slug = ? AND user_id = ?").bind(slug, auth.user.id).first() as Record<string, unknown> | null;
  if (!project) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const entryId = request.nextUrl.searchParams.get("id");
  if (!entryId) return NextResponse.json({ error: "항목 ID가 필요합니다." }, { status: 400 });

  await db.prepare("DELETE FROM launchpad_changelog WHERE id = ? AND project_id = ?").bind(entryId, project.id).run();
  return NextResponse.json({ ok: true });
}
