import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);

  const row = await db.prepare("SELECT * FROM countdowns WHERE slug = ? LIMIT 1").bind(slug).first() as Record<string, unknown> | null;
  if (!row) return NextResponse.json({ error: "존재하지 않는 카운트다운입니다." }, { status: 404 });
  if (!row.is_public) {
    const auth = await requireAuth(db, request);
    if (auth.error || !auth.user || auth.user.id !== row.user_id)
      return NextResponse.json({ error: "비공개 카운트다운입니다." }, { status: 403 });
  }

  // Increment view count
  await db.prepare("UPDATE countdowns SET view_count = view_count + 1 WHERE slug = ?").bind(slug).run();

  return NextResponse.json({ countdown: row });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const row = await db.prepare("SELECT * FROM countdowns WHERE slug = ? LIMIT 1").bind(slug).first() as Record<string, unknown> | null;
  if (!row) return NextResponse.json({ error: "존재하지 않습니다." }, { status: 404 });
  if (row.user_id !== auth.user.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await request.json();
  const { title, description, target_at, theme, is_public } = body;
  const now = Date.now();

  await db.prepare(
    `UPDATE countdowns SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      target_at = COALESCE(?, target_at),
      theme = COALESCE(?, theme),
      is_public = COALESCE(?, is_public),
      updated_at = ?
     WHERE slug = ?`
  ).bind(
    title ?? null, description ?? null,
    target_at ? new Date(target_at).getTime() : null,
    theme ?? null, is_public !== undefined ? (is_public ? 1 : 0) : null,
    now, slug
  ).run();

  const updated = await db.prepare("SELECT * FROM countdowns WHERE slug = ?").bind(slug).first();
  return NextResponse.json({ countdown: updated });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const row = await db.prepare("SELECT user_id FROM countdowns WHERE slug = ?").bind(slug).first() as Record<string, unknown> | null;
  if (!row) return NextResponse.json({ error: "존재하지 않습니다." }, { status: 404 });
  if (row.user_id !== auth.user.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  await db.prepare("DELETE FROM countdowns WHERE slug = ?").bind(slug).run();
  return NextResponse.json({ ok: true });
}
