import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { generateId } from "@/lib/utils";
import { checkRateLimit } from "@/lib/auth";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { code } = await params;
  const db = getDB(request);

  const space = await db.prepare("SELECT * FROM local_spaces WHERE code = ? AND is_active = 1").bind(code.toUpperCase()).first() as Record<string, unknown> | null;
  if (!space) return NextResponse.json({ error: "공간을 찾을 수 없습니다." }, { status: 404 });

  const since = request.nextUrl.searchParams.get("since");
  let rows;
  if (since) {
    rows = await db.prepare("SELECT * FROM local_messages WHERE space_id = ? AND created_at > ? ORDER BY created_at ASC LIMIT 100").bind(space.id, Number(since)).all();
  } else {
    rows = await db.prepare("SELECT * FROM local_messages WHERE space_id = ? ORDER BY created_at DESC LIMIT 100").all();
    rows = { results: (rows.results ?? []).reverse() };
  }

  return NextResponse.json({ messages: rows.results ?? [] });
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const { code } = await params;
  const db = getDB(request);

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit({ key: `local:${ip}`, limit: 20, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });

  const space = await db.prepare("SELECT * FROM local_spaces WHERE code = ? AND is_active = 1").bind(code.toUpperCase()).first() as Record<string, unknown> | null;
  if (!space) return NextResponse.json({ error: "공간을 찾을 수 없습니다." }, { status: 404 });

  const body = await request.json();
  const { author_name, content } = body;
  if (!author_name?.trim()) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  if (!content?.trim()) return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
  if (content.length > 1000) return NextResponse.json({ error: "메시지는 1000자 이하여야 합니다." }, { status: 400 });

  const id = generateId("lmg");
  const now = Date.now();

  await db.prepare("INSERT INTO local_messages (id, space_id, author_name, content, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, space.id, author_name.trim(), content.trim(), now).run();

  return NextResponse.json({ ok: true, message: { id, author_name: author_name.trim(), content: content.trim(), created_at: now } }, { status: 201 });
}
