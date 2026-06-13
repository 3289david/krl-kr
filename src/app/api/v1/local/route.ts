import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId } from "@/lib/utils";

function generateCode(len = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const rows = await db.prepare(
    `SELECT s.*, (SELECT COUNT(*) FROM local_messages m WHERE m.space_id = s.id) AS message_count
     FROM local_spaces s WHERE s.user_id = ? ORDER BY s.created_at DESC`
  ).bind(auth.user.id).all();

  return NextResponse.json({ spaces: rows.results ?? [] });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const { name, description, ssid_hint } = body;
  if (!name?.trim()) return NextResponse.json({ error: "공간 이름을 입력해주세요." }, { status: 400 });

  let code = generateCode(6);
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.prepare("SELECT id FROM local_spaces WHERE code = ?").bind(code).first();
    if (!existing) break;
    code = generateCode(6);
    attempts++;
  }

  const id = generateId("loc");
  const now = Date.now();

  await db.prepare(
    `INSERT INTO local_spaces (id, user_id, name, code, description, ssid_hint, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
  ).bind(id, auth.user.id, name.trim(), code, description ?? null, ssid_hint ?? null, now).run();

  return NextResponse.json({ space: { id, name: name.trim(), code, description, ssid_hint, is_active: 1, message_count: 0 } }, { status: 201 });
}
