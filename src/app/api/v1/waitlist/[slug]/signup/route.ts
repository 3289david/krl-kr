import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { generateId, generateSlug } from "@/lib/utils";
import { checkRateLimit } from "@/lib/auth";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit({ key: `waitlist:${ip}`, limit: 5, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });

  const waitlist = await db.prepare("SELECT * FROM waitlists WHERE slug = ?").bind(slug).first() as Record<string, unknown> | null;
  if (!waitlist) return NextResponse.json({ error: "존재하지 않는 대기자 명단입니다." }, { status: 404 });
  if (!waitlist.is_open) return NextResponse.json({ error: "등록이 마감되었습니다." }, { status: 410 });

  const body = await request.json();
  const { email, name, ref } = body;

  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "올바른 이메일 주소를 입력해주세요." }, { status: 400 });

  const existing = await db.prepare("SELECT id, referral_code FROM waitlist_signups WHERE waitlist_id = ? AND email = ?").bind(waitlist.id, email.toLowerCase()).first() as Record<string, unknown> | null;
  if (existing) {
    const posRow = await db.prepare("SELECT COUNT(*) AS cnt FROM waitlist_signups WHERE waitlist_id = ? AND created_at <= (SELECT created_at FROM waitlist_signups WHERE id = ?)").bind(waitlist.id, existing.id).first() as Record<string, unknown>;
    return NextResponse.json({
      ok: true,
      already: true,
      position: Number(posRow?.cnt ?? 1),
      referral_code: existing.referral_code,
      referral_url: `https://krl.kr/waitlist/${slug}?ref=${existing.referral_code}`,
    });
  }

  // Resolve referrer
  let referredBy: string | null = null;
  if (ref) {
    const refRow = await db.prepare("SELECT id FROM waitlist_signups WHERE referral_code = ? AND waitlist_id = ?").bind(ref, waitlist.id).first() as Record<string, unknown> | null;
    if (refRow) {
      referredBy = refRow.id as string;
      await db.prepare("UPDATE waitlist_signups SET points = points + 10 WHERE id = ?").bind(refRow.id).run();
    }
  }

  // Count current signups for position
  const countRow = await db.prepare("SELECT COUNT(*) AS cnt FROM waitlist_signups WHERE waitlist_id = ?").bind(waitlist.id).first() as Record<string, unknown>;
  const position = (Number(countRow?.cnt ?? 0)) + 1;

  const id = generateId("wls");
  const referralCode = generateSlug(8);
  const now = Date.now();

  await db.prepare(
    `INSERT INTO waitlist_signups (id, waitlist_id, email, name, referral_code, referred_by, points, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
  ).bind(id, waitlist.id, email.toLowerCase().trim(), name?.trim() ?? null, referralCode, referredBy, now).run();

  return NextResponse.json({
    ok: true,
    position,
    referral_code: referralCode,
    referral_url: `https://krl.kr/waitlist/${slug}?ref=${referralCode}`,
  }, { status: 201 });
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);
  const { requireAuth } = await import("@/lib/auth");
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const waitlist = await db.prepare("SELECT * FROM waitlists WHERE slug = ? AND user_id = ?").bind(slug, auth.user.id).first() as Record<string, unknown> | null;
  if (!waitlist) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1"));
  const limit = 50;
  const offset = (page - 1) * limit;

  const rows = await db.prepare(
    "SELECT * FROM waitlist_signups WHERE waitlist_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?"
  ).bind(waitlist.id, limit, offset).all();

  const total = await db.prepare("SELECT COUNT(*) AS cnt FROM waitlist_signups WHERE waitlist_id = ?").bind(waitlist.id).first() as Record<string, unknown>;

  return NextResponse.json({ signups: rows.results ?? [], total: Number(total?.cnt ?? 0), page, limit });
}
