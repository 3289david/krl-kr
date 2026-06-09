import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);

  const row = await db.prepare(
    `SELECT g.*, (SELECT COUNT(*) FROM guestbook_entries e WHERE e.guestbook_id = g.id AND e.is_approved = 1) AS entry_count
     FROM guestbooks g WHERE g.slug = ? LIMIT 1`
  ).bind(slug).first();

  if (!row) return NextResponse.json({ error: "존재하지 않습니다." }, { status: 404 });
  return NextResponse.json({ guestbook: row });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const row = await db.prepare("SELECT * FROM guestbooks WHERE slug = ?").bind(slug).first() as Record<string, unknown> | null;
  if (!row) return NextResponse.json({ error: "존재하지 않습니다." }, { status: 404 });
  if (row.user_id !== auth.user.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await request.json();
  const now = Date.now();

  await db.prepare(
    `UPDATE guestbooks SET
      name = COALESCE(?, name), description = COALESCE(?, description),
      allow_anonymous = COALESCE(?, allow_anonymous),
      require_approval = COALESCE(?, require_approval),
      theme = COALESCE(?, theme), updated_at = ?
     WHERE slug = ?`
  ).bind(
    body.name ?? null, body.description ?? null,
    body.allow_anonymous !== undefined ? (body.allow_anonymous ? 1 : 0) : null,
    body.require_approval !== undefined ? (body.require_approval ? 1 : 0) : null,
    body.theme ?? null, now, slug
  ).run();

  const updated = await db.prepare("SELECT * FROM guestbooks WHERE slug = ?").bind(slug).first();
  return NextResponse.json({ guestbook: updated });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const row = await db.prepare("SELECT user_id FROM guestbooks WHERE slug = ?").bind(slug).first() as Record<string, unknown> | null;
  if (!row) return NextResponse.json({ error: "존재하지 않습니다." }, { status: 404 });
  if (row.user_id !== auth.user.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  await db.prepare("DELETE FROM guestbooks WHERE slug = ?").bind(slug).run();
  return NextResponse.json({ ok: true });
}
