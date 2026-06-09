import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);

  const row = await db.prepare(
    `SELECT w.*, (SELECT COUNT(*) FROM waitlist_signups s WHERE s.waitlist_id = w.id) AS signup_count
     FROM waitlists w WHERE w.slug = ? LIMIT 1`
  ).bind(slug).first();

  if (!row) return NextResponse.json({ error: "존재하지 않습니다." }, { status: 404 });
  return NextResponse.json({ waitlist: row }, { headers: { "Cache-Control": "public, max-age=10" } });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const row = await db.prepare("SELECT * FROM waitlists WHERE slug = ?").bind(slug).first() as Record<string, unknown> | null;
  if (!row) return NextResponse.json({ error: "존재하지 않습니다." }, { status: 404 });
  if (row.user_id !== auth.user.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await request.json();
  const now = Date.now();

  await db.prepare(
    `UPDATE waitlists SET
      name = COALESCE(?, name), description = COALESCE(?, description),
      cta = COALESCE(?, cta), referral_enabled = COALESCE(?, referral_enabled),
      is_open = COALESCE(?, is_open), goal = COALESCE(?, goal), updated_at = ?
     WHERE slug = ?`
  ).bind(
    body.name ?? null, body.description ?? null, body.cta ?? null,
    body.referral_enabled !== undefined ? (body.referral_enabled ? 1 : 0) : null,
    body.is_open !== undefined ? (body.is_open ? 1 : 0) : null,
    body.goal ?? null, now, slug
  ).run();

  const updated = await db.prepare("SELECT * FROM waitlists WHERE slug = ?").bind(slug).first();
  return NextResponse.json({ waitlist: updated });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const row = await db.prepare("SELECT user_id FROM waitlists WHERE slug = ?").bind(slug).first() as Record<string, unknown> | null;
  if (!row) return NextResponse.json({ error: "존재하지 않습니다." }, { status: 404 });
  if (row.user_id !== auth.user.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  await db.prepare("DELETE FROM waitlists WHERE slug = ?").bind(slug).run();
  return NextResponse.json({ ok: true });
}
