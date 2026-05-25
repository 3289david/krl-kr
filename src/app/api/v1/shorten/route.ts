/**
 * KRL.KR — Public URL Shortening API
 * POST /api/v1/shorten
 *
 * Authenticated users can use API key header: X-API-Key: krl_xxx
 * Unauthenticated users can shorten (rate-limited, no analytics)
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { generateId, generateSlug, isValidUrl, isValidSlug, normalizeUrl } from "@/lib/utils";
import { checkRateLimit } from "@/lib/auth";
import { z } from "zod";

const ShortenSchema = z.object({
  url: z.string().min(1, "URL을 입력해주세요."),
  slug: z.string().optional(),
  title: z.string().max(200).optional(),
  password: z.string().max(100).optional(),
  expires_at: z.string().optional(), // ISO date string
  max_clicks: z.number().int().positive().optional(),
  is_dynamic: z.boolean().optional(),
  ios_url: z.string().url().optional(),
  android_url: z.string().url().optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ShortenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.errors[0]?.message ?? "잘못된 요청입니다.",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Normalize & validate URL
    const originalUrl = normalizeUrl(data.url);
    if (!isValidUrl(originalUrl)) {
      return NextResponse.json(
        { error: "유효한 URL을 입력해주세요. (http:// 또는 https://)", code: "INVALID_URL" },
        { status: 400 }
      );
    }

    // Block internal URLs
    try {
      const parsed = new URL(originalUrl);
      if (parsed.hostname === "krl.kr" || parsed.hostname.endsWith(".krl.kr")) {
        return NextResponse.json(
          { error: "krl.kr 도메인은 단축할 수 없습니다.", code: "INVALID_URL" },
          { status: 400 }
        );
      }
    } catch {
      // Already validated above
    }

    // Rate limiting (IP-based for unauthenticated)
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for") ??
      "unknown";

    const rateLimit = await checkRateLimit({
      key: `shorten:${ip}`,
      limit: 10,
      windowMs: 60 * 1000, // 10 per minute
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          },
        }
      );
    }

    // Try to authenticate the user (optional for this endpoint)
    let userId: string | null = null;
    const db = getDB(request);

    if (db) {
      const apiKey =
        request.headers.get("X-API-Key") ??
        request.headers.get("Authorization")?.replace("Bearer ", "");

      if (apiKey?.startsWith("krl_")) {
        try {
          const { authenticateApiKey } = await import("@/lib/auth");
          const user = await authenticateApiKey(db, apiKey);
          if (user) userId = user.id;
        } catch {
          // Auth failed, continue as anonymous
        }
      }
    }

    // Determine slug
    let slug = data.slug;

    if (slug) {
      // Validate custom slug
      const { valid, reason } = isValidSlug(slug);
      if (!valid) {
        return NextResponse.json({ error: reason, code: "INVALID_SLUG" }, { status: 400 });
      }

      // Check uniqueness
      if (db) {
        const existing = await db
          .prepare("SELECT id FROM links WHERE slug = ? LIMIT 1")
          .bind(slug)
          .first();
        if (existing) {
          return NextResponse.json(
            { error: "이미 사용 중인 슬러그입니다.", code: "SLUG_TAKEN" },
            { status: 409 }
          );
        }
      }
    } else {
      // Generate unique slug
      slug = generateSlug(6);
      if (db) {
        // Ensure uniqueness
        let attempts = 0;
        while (attempts < 10) {
          const existing = await db
            .prepare("SELECT id FROM links WHERE slug = ? LIMIT 1")
            .bind(slug)
            .first();
          if (!existing) break;
          slug = generateSlug(6 + Math.floor(attempts / 3));
          attempts++;
        }
      }
    }

    // Hash password if provided
    let passwordHash: string | null = null;
    if (data.password) {
      const { hashPassword } = await import("@/lib/auth");
      passwordHash = await hashPassword(data.password);
    }

    // Parse expiry
    let expiresAt: number | null = null;
    if (data.expires_at) {
      expiresAt = new Date(data.expires_at).getTime();
      if (isNaN(expiresAt)) {
        return NextResponse.json(
          { error: "잘못된 날짜 형식입니다.", code: "INVALID_DATE" },
          { status: 400 }
        );
      }
    }

    const linkId = generateId("lnk");
    const now = Date.now();

    // Save to DB
    if (db) {
      await db
        .prepare(
          `INSERT INTO links (
            id, slug, original_url, user_id, title, description, og_image,
            password_hash, is_active, expires_at, max_clicks, click_count, unique_count,
            is_dynamic, ios_url, android_url, fallback_url, geo_rules, device_rules,
            utm_source, utm_medium, utm_campaign, created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, NULL, NULL,
            ?, 1, ?, ?, 0, 0,
            ?, ?, ?, NULL, NULL, NULL,
            ?, ?, ?, ?, ?
          )`
        )
        .bind(
          linkId, slug, originalUrl, userId, data.title ?? null,
          passwordHash, expiresAt, data.max_clicks ?? null,
          data.is_dynamic ? 1 : 0,
          data.ios_url ?? null, data.android_url ?? null,
          data.utm_source ?? null, data.utm_medium ?? null, data.utm_campaign ?? null,
          now, now
        )
        .run();
    }

    const shortUrl = `https://krl.kr/${slug}`;

    return NextResponse.json(
      {
        id: linkId,
        slug,
        short_url: shortUrl,
        original_url: originalUrl,
        created_at: new Date(now).toISOString(),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        has_password: !!passwordHash,
        qr_url: `https://krl.kr/api/qr/${slug}`,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[/api/v1/shorten] Error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
    },
  });
}
