import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth, checkRateLimit } from "@/lib/auth";
import { generateId } from "@/lib/utils";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);

  const gb = await db.prepare("SELECT * FROM guestbooks WHERE slug = ?").bind(slug).first() as Record<string, unknown> | null;
  if (!gb) return NextResponse.json({ error: "존재하지 않습니다." }, { status: 404 });

  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1"));
  const limit = 20;
  const offset = (page - 1) * limit;

  const rows = await db.prepare(
    "SELECT * FROM guestbook_entries WHERE guestbook_id = ? AND is_approved = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?"
  ).bind(gb.id, limit, offset).all();

  const total = await db.prepare("SELECT COUNT(*) AS cnt FROM guestbook_entries WHERE guestbook_id = ? AND is_approved = 1").bind(gb.id).first() as Record<string, unknown>;

  return NextResponse.json({ entries: rows.results ?? [], total: Number(total?.cnt ?? 0), page, limit }, {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=10" }
  });
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit({ key: `gb:${slug}:${ip}`, limit: 3, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: "너무 많은 요청입니다." }, { status: 429 });

  const gb = await db.prepare("SELECT * FROM guestbooks WHERE slug = ?").bind(slug).first() as Record<string, unknown> | null;
  if (!gb) return NextResponse.json({ error: "존재하지 않습니다." }, { status: 404 });

  const body = await request.json();
  const { author_name, author_email, content } = body;

  if (!content?.trim() || content.trim().length < 2)
    return NextResponse.json({ error: "내용을 2자 이상 입력해주세요." }, { status: 400 });
  if (content.trim().length > 500)
    return NextResponse.json({ error: "내용은 500자 이내로 입력해주세요." }, { status: 400 });

  if (!gb.allow_anonymous && !author_name?.trim())
    return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });

  const name = author_name?.trim() || "익명";
  const approved = !gb.require_approval;

  const id = generateId("gbe");
  const now = Date.now();

  await db.prepare(
    `INSERT INTO guestbook_entries (id, guestbook_id, author_name, author_email, content, is_approved, ip, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, gb.id, name, author_email?.trim() ?? null, content.trim(), approved ? 1 : 0, ip, now).run();

  return NextResponse.json({
    ok: true,
    entry: { id, author_name: name, content: content.trim(), is_approved: approved, created_at: now },
    pending: !approved,
  }, { status: 201, headers: { "Access-Control-Allow-Origin": "*" } });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const gb = await db.prepare("SELECT * FROM guestbooks WHERE slug = ? AND user_id = ?").bind(slug, auth.user.id).first() as Record<string, unknown> | null;
  if (!gb) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const entryId = request.nextUrl.searchParams.get("id");
  if (!entryId) return NextResponse.json({ error: "항목 ID가 필요합니다." }, { status: 400 });

  await db.prepare("DELETE FROM guestbook_entries WHERE id = ? AND guestbook_id = ?").bind(entryId, gb.id).run();
  return NextResponse.json({ ok: true });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" }
  });
}
