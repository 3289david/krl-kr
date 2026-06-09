import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId, generateSlug } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const rows = await db.prepare("SELECT * FROM patches WHERE user_id = ? ORDER BY created_at DESC").bind(auth.user.id).all();
  return NextResponse.json({ patches: rows.results ?? [] });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const { message, type = "info", cta_text, cta_url, bg_color = "#1e40af", text_color = "#ffffff" } = body;
  let { site_key } = body;

  if (!message?.trim()) return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });

  if (!site_key?.trim()) {
    site_key = generateSlug(10);
  } else {
    site_key = site_key.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
  }

  const existing = await db.prepare("SELECT id FROM patches WHERE site_key = ?").bind(site_key).first();
  if (existing) return NextResponse.json({ error: "이미 사용 중인 사이트 키입니다." }, { status: 409 });

  const id = generateId("ptch");
  const now = Date.now();

  await db.prepare(
    `INSERT INTO patches (id, user_id, site_key, message, type, is_active, cta_text, cta_url, bg_color, text_color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`
  ).bind(id, auth.user.id, site_key, message.trim(), type, cta_text ?? null, cta_url ?? null, bg_color, text_color, now, now).run();

  return NextResponse.json({ patch: { id, site_key, message, type, is_active: 0, cta_text, cta_url, bg_color, text_color } }, { status: 201 });
}
