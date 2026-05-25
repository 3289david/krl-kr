/**
 * KRL.KR — Links CRUD API
 * GET /api/links — list user's links
 * POST /api/links — create link (authenticated)
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { z } from "zod";
import { generateId, generateSlug, isValidUrl, isValidSlug, normalizeUrl } from "@/lib/utils";
import { requireAuth } from "@/lib/auth";

const CreateLinkSchema = z.object({
  url: z.string().min(1),
  slug: z.string().optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  password: z.string().max(100).optional(),
  expires_at: z.string().optional(),
  max_clicks: z.number().int().positive().optional(),
  is_dynamic: z.boolean().optional(),
  ios_url: z.string().url().optional().or(z.literal("")),
  android_url: z.string().url().optional().or(z.literal("")),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
  geo_rules: z.array(z.object({ country: z.string(), url: z.string().url() })).optional(),
  device_rules: z.array(z.object({ device: z.string(), url: z.string().url() })).optional(),
});

export async function GET(request: NextRequest) {
  const db = getDB(request);
  if (!db) {
    return NextResponse.json({ error: "DB_ERROR", links: [] }, { status: 503 });
  }

  const auth = await requireAuth(db, request);
  if (auth.error) return auth.error;
  const { user } = auth;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "20"));
  const offset = (page - 1) * limit;
  const search = url.searchParams.get("q") ?? "";

  let query = "SELECT * FROM links WHERE user_id = ?";
  const params: unknown[] = [user.id];

  if (search) {
    query += " AND (slug LIKE ? OR original_url LIKE ? OR title LIKE ?)";
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [links, countResult] = await Promise.all([
    db.prepare(query).bind(...params).all(),
    db
      .prepare("SELECT COUNT(*) as count FROM links WHERE user_id = ?")
      .bind(user.id)
      .first<{ count: number }>(),
  ]);

  return NextResponse.json({
    links: links.results,
    total: countResult?.count ?? 0,
    page,
    limit,
  });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  if (!db) {
    return NextResponse.json({ error: "DB_ERROR" }, { status: 503 });
  }

  const auth = await requireAuth(db, request);
  if (auth.error) return auth.error;
  const { user } = auth;

  // Check plan limits
  const linkCount = await db
    .prepare("SELECT COUNT(*) as count FROM links WHERE user_id = ?")
    .bind(user.id)
    .first<{ count: number }>();

  if (user.plan === "free" && (linkCount?.count ?? 0) >= 50) {
    return NextResponse.json(
      {
        error: "무료 플랜에서는 최대 50개의 링크를 생성할 수 있습니다. 프로 플랜으로 업그레이드하세요.",
        code: "PLAN_LIMIT_EXCEEDED",
        upgrade_url: "https://krl.kr/pricing",
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = CreateLinkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const originalUrl = normalizeUrl(data.url);

  if (!isValidUrl(originalUrl)) {
    return NextResponse.json(
      { error: "유효한 URL을 입력해주세요.", code: "INVALID_URL" },
      { status: 400 }
    );
  }

  // Slug handling
  let slug = data.slug;
  if (slug) {
    const { valid, reason } = isValidSlug(slug);
    if (!valid) {
      return NextResponse.json({ error: reason, code: "INVALID_SLUG" }, { status: 400 });
    }
    const existing = await db
      .prepare("SELECT id FROM links WHERE slug = ? LIMIT 1")
      .bind(slug)
      .first();
    if (existing) {
      return NextResponse.json({ error: "이미 사용 중인 슬러그입니다.", code: "SLUG_TAKEN" }, { status: 409 });
    }
  } else {
    slug = generateSlug(6);
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.prepare("SELECT id FROM links WHERE slug = ? LIMIT 1").bind(slug).first();
      if (!existing) break;
      slug = generateSlug(6 + Math.floor(attempts / 3));
      attempts++;
    }
  }

  // Password hash
  let passwordHash: string | null = null;
  if (data.password) {
    const { hashPassword } = await import("@/lib/auth");
    passwordHash = await hashPassword(data.password);
  }

  // Expiry
  let expiresAt: number | null = null;
  if (data.expires_at) {
    expiresAt = new Date(data.expires_at).getTime();
    if (isNaN(expiresAt)) {
      return NextResponse.json({ error: "잘못된 날짜 형식입니다.", code: "INVALID_DATE" }, { status: 400 });
    }
  }

  const linkId = generateId("lnk");
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO links (
        id, slug, original_url, user_id, title, description, og_image,
        password_hash, is_active, expires_at, max_clicks, click_count, unique_count,
        is_dynamic, ios_url, android_url, fallback_url, geo_rules, device_rules,
        utm_source, utm_medium, utm_campaign, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, NULL,
        ?, 1, ?, ?, 0, 0,
        ?, ?, ?, NULL, ?, ?,
        ?, ?, ?, ?, ?
      )`
    )
    .bind(
      linkId, slug, originalUrl, user.id,
      data.title ?? null, data.description ?? null,
      passwordHash, expiresAt, data.max_clicks ?? null,
      data.is_dynamic ? 1 : 0,
      data.ios_url || null, data.android_url || null,
      data.geo_rules ? JSON.stringify(data.geo_rules) : null,
      data.device_rules ? JSON.stringify(data.device_rules) : null,
      data.utm_source ?? null, data.utm_medium ?? null, data.utm_campaign ?? null,
      now, now
    )
    .run();

  const link = await db
    .prepare("SELECT * FROM links WHERE id = ? LIMIT 1")
    .bind(linkId)
    .first();

  return NextResponse.json(
    {
      link,
      short_url: `https://krl.kr/${slug}`,
      qr_url: `https://krl.kr/api/qr/${slug}`,
    },
    { status: 201 }
  );
}
