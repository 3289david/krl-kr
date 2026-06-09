import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

type Ctx = { params: Promise<{ siteKey: string }> };

// Public GET — returns banner data for the embed script
export async function GET(request: NextRequest, { params }: Ctx) {
  const { siteKey } = await params;
  const db = getDB(request);

  const row = await db.prepare("SELECT message, type, is_active, cta_text, cta_url, bg_color, text_color FROM patches WHERE site_key = ?").bind(siteKey).first();
  if (!row) return NextResponse.json({ active: false });

  return NextResponse.json(row, {
    headers: {
      "Cache-Control": "public, max-age=30, s-maxage=30",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { siteKey } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const row = await db.prepare("SELECT * FROM patches WHERE site_key = ?").bind(siteKey).first() as Record<string, unknown> | null;
  if (!row) return NextResponse.json({ error: "존재하지 않습니다." }, { status: 404 });
  if (row.user_id !== auth.user.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await request.json();
  const now = Date.now();

  await db.prepare(
    `UPDATE patches SET
      message = COALESCE(?, message),
      type = COALESCE(?, type),
      is_active = COALESCE(?, is_active),
      cta_text = COALESCE(?, cta_text),
      cta_url = COALESCE(?, cta_url),
      bg_color = COALESCE(?, bg_color),
      text_color = COALESCE(?, text_color),
      updated_at = ?
     WHERE site_key = ?`
  ).bind(
    body.message ?? null, body.type ?? null,
    body.is_active !== undefined ? (body.is_active ? 1 : 0) : null,
    body.cta_text ?? null, body.cta_url ?? null,
    body.bg_color ?? null, body.text_color ?? null,
    now, siteKey
  ).run();

  const updated = await db.prepare("SELECT * FROM patches WHERE site_key = ?").bind(siteKey).first();
  return NextResponse.json({ patch: updated });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { siteKey } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const row = await db.prepare("SELECT user_id FROM patches WHERE site_key = ?").bind(siteKey).first() as Record<string, unknown> | null;
  if (!row) return NextResponse.json({ error: "존재하지 않습니다." }, { status: 404 });
  if (row.user_id !== auth.user.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  await db.prepare("DELETE FROM patches WHERE site_key = ?").bind(siteKey).run();
  return NextResponse.json({ ok: true });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET" } });
}
