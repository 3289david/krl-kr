import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);

  const row = await db.prepare("SELECT * FROM launchpad_projects WHERE slug = ? LIMIT 1").bind(slug).first() as Record<string, unknown> | null;
  if (!row) return NextResponse.json({ error: "존재하지 않습니다." }, { status: 404 });
  if (!row.is_public) {
    const auth = await requireAuth(db, request);
    if (auth.error || !auth.user || auth.user.id !== row.user_id)
      return NextResponse.json({ error: "비공개 프로젝트입니다." }, { status: 403 });
  }

  const changelog = await db.prepare("SELECT * FROM launchpad_changelog WHERE project_id = ? ORDER BY created_at DESC LIMIT 10").bind(row.id).all();
  return NextResponse.json({ project: row, changelog: changelog.results ?? [] });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const row = await db.prepare("SELECT * FROM launchpad_projects WHERE slug = ?").bind(slug).first() as Record<string, unknown> | null;
  if (!row) return NextResponse.json({ error: "존재하지 않습니다." }, { status: 404 });
  if (row.user_id !== auth.user.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await request.json();
  const now = Date.now();
  const fields: string[] = [];
  const values: unknown[] = [];
  const allowed = ["name","tagline","description","status","website_url","github_url","twitter_url","logo_text","accent_color","is_public","contact_email"];
  for (const f of allowed) {
    if (f in body) {
      fields.push(`${f} = ?`);
      values.push(f === "is_public" ? (body[f] ? 1 : 0) : (body[f] ?? null));
    }
  }
  if (fields.length === 0) return NextResponse.json({ error: "변경할 내용이 없습니다." }, { status: 400 });
  fields.push("updated_at = ?");
  values.push(now, slug);

  await db.prepare(`UPDATE launchpad_projects SET ${fields.join(", ")} WHERE slug = ?`).bind(...values).run();
  const updated = await db.prepare("SELECT * FROM launchpad_projects WHERE slug = ?").bind(slug).first();
  return NextResponse.json({ project: updated });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const row = await db.prepare("SELECT user_id FROM launchpad_projects WHERE slug = ?").bind(slug).first() as Record<string, unknown> | null;
  if (!row) return NextResponse.json({ error: "존재하지 않습니다." }, { status: 404 });
  if (row.user_id !== auth.user.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  await db.prepare("DELETE FROM launchpad_projects WHERE slug = ?").bind(slug).run();
  return NextResponse.json({ ok: true });
}
