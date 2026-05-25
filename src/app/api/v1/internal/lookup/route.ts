/**
 * KRL.KR — Internal Edge-Worker Lookup API
 * GET /api/v1/internal/lookup?slug=<slug>
 *
 * Called by the Cloudflare Edge Worker (worker/index.ts) for every
 * potential short-link slug request. Returns either a redirect URL
 * or a directive to pass the request through to Next.js.
 *
 * Protected by the shared WORKER_SECRET header (X-Worker-Secret).
 * The edge worker records analytics data in query params so the VPS
 * can store them without an extra POST round-trip.
 *
 * Response shapes:
 *   { redirect_url: string }            → worker should 302 to this URL
 *   { pass_through: true, reason: string } → worker should forward to origin
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/postgres";
import { generateId, isExpired } from "@/lib/utils";
import { md5 } from "@/lib/utils";

export const runtime = "nodejs";

// ─── Auth ─────────────────────────────────────────────────────────────────────
function authorize(request: NextRequest): boolean {
  const secret = request.headers.get("x-worker-secret");
  return !!secret && secret === process.env.WORKER_SECRET;
}

// ─── GET /api/v1/internal/lookup ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json(
      { pass_through: true, reason: "no_slug" },
      { status: 200 }
    );
  }

  // ── Visitor context (forwarded from edge worker) ───────────────────────────
  const ua = searchParams.get("ua") ?? "";
  const ip = searchParams.get("ip") ?? "unknown";
  const country = searchParams.get("country") ?? null;
  const city = searchParams.get("city") ?? null;
  const region = searchParams.get("region") ?? null;
  const referer = searchParams.get("referer") ?? null;

  // ── Look up the link ───────────────────────────────────────────────────────
  let link: {
    id: string;
    original_url: string;
    password_hash: string | null;
    expires_at: number | null;
    max_clicks: number | null;
    click_count: number;
    is_active: number;
    is_dynamic: number;
    ios_url: string | null;
    android_url: string | null;
    geo_rules: string | null;
    device_rules: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
  } | null;

  try {
    link = await db
      .prepare(
        `SELECT id, original_url, password_hash, expires_at, max_clicks,
                click_count, is_active, is_dynamic, ios_url, android_url,
                geo_rules, device_rules, utm_source, utm_medium, utm_campaign
         FROM links WHERE slug = ? AND is_active = 1 LIMIT 1`
      )
      .bind(slug)
      .first();
  } catch (err) {
    console.error("[internal/lookup] DB error:", err);
    return NextResponse.json(
      { pass_through: true, reason: "db_error" },
      { status: 200 }
    );
  }

  // Not found → let Next.js render its 404
  if (!link) {
    return NextResponse.json(
      { pass_through: true, reason: "not_found" },
      { status: 200 }
    );
  }

  // Expired → let Next.js render the expired page
  if (isExpired(link.expires_at)) {
    return NextResponse.json(
      { pass_through: true, reason: "expired" },
      { status: 200 }
    );
  }

  // Max clicks reached → let Next.js render the limit page
  if (link.max_clicks !== null && link.click_count >= link.max_clicks) {
    return NextResponse.json(
      { pass_through: true, reason: "max_clicks" },
      { status: 200 }
    );
  }

  // Password-protected → let Next.js render the password gate
  if (link.password_hash) {
    return NextResponse.json(
      { pass_through: true, reason: "password_required" },
      { status: 200 }
    );
  }

  // ── Determine target URL ───────────────────────────────────────────────────
  let targetUrl = link.original_url;

  const device = getDevice(ua);
  const os = getOS(ua);

  // App links (iOS / Android deep links)
  if (os === "iOS" && link.ios_url) {
    targetUrl = link.ios_url;
  } else if (os === "Android" && link.android_url) {
    targetUrl = link.android_url;
  } else {
    // Geo-based redirect
    if (link.geo_rules && country) {
      try {
        const rules = JSON.parse(link.geo_rules) as Array<{
          country: string;
          url: string;
        }>;
        const rule = rules.find(
          (r) => r.country.toUpperCase() === country.toUpperCase()
        );
        if (rule?.url) targetUrl = rule.url;
      } catch {
        // Ignore invalid JSON
      }
    }

    // Device-based redirect
    if (link.device_rules) {
      try {
        const rules = JSON.parse(link.device_rules) as Array<{
          device: string;
          url: string;
        }>;
        const rule = rules.find((r) => r.device === device);
        if (rule?.url) targetUrl = rule.url;
      } catch {
        // Ignore invalid JSON
      }
    }
  }

  // Append UTM params
  if (link.utm_source || link.utm_medium || link.utm_campaign) {
    try {
      const parsed = new URL(targetUrl);
      if (link.utm_source && !parsed.searchParams.has("utm_source"))
        parsed.searchParams.set("utm_source", link.utm_source);
      if (link.utm_medium && !parsed.searchParams.has("utm_medium"))
        parsed.searchParams.set("utm_medium", link.utm_medium);
      if (link.utm_campaign && !parsed.searchParams.has("utm_campaign"))
        parsed.searchParams.set("utm_campaign", link.utm_campaign);
      targetUrl = parsed.toString();
    } catch {
      // Not a valid URL — use as-is
    }
  }

  // ── Record analytics (fire-and-forget) ───────────────────────────────────
  recordClick({
    linkId: link.id,
    ip,
    ua,
    country,
    city,
    region,
    referer,
    device,
    os,
  }).catch(console.error);

  return NextResponse.json({ redirect_url: targetUrl }, { status: 200 });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

async function recordClick(opts: {
  linkId: string;
  ip: string;
  ua: string;
  country: string | null;
  city: string | null;
  region: string | null;
  referer: string | null;
  device: string;
  os: string;
}): Promise<void> {
  const { linkId, ip, ua, country, city, region, referer, device, os } = opts;

  try {
    const ipHash = await md5(ip);
    const browser = getBrowser(ua);
    const refererDomain = referer ? extractDomain(referer) : null;
    const now = Date.now();

    // Deduplicate within 24 h from same IP
    const existing = await db
      .prepare(
        "SELECT id FROM clicks WHERE link_id = ? AND ip_hash = ? AND clicked_at > ? LIMIT 1"
      )
      .bind(linkId, ipHash, now - 86_400_000)
      .first();

    const isUnique = !existing;
    const clickId = generateId("clk");

    await db
      .prepare(
        `INSERT INTO clicks (
          id, link_id, clicked_at, country, city, region,
          device_type, browser, os, referer, referer_domain, user_agent, ip_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        clickId,
        linkId,
        now,
        country,
        city,
        region,
        device,
        browser,
        os,
        referer,
        refererDomain,
        ua.substring(0, 500),
        ipHash
      )
      .run();

    if (isUnique) {
      await db
        .prepare(
          "UPDATE links SET click_count = click_count + 1, unique_count = unique_count + 1 WHERE id = ?"
        )
        .bind(linkId)
        .run();
    } else {
      await db
        .prepare("UPDATE links SET click_count = click_count + 1 WHERE id = ?")
        .bind(linkId)
        .run();
    }
  } catch (err) {
    console.error("[internal/lookup] Analytics error:", err);
    // Never throw — analytics must not break redirects
  }
}

// ─── UA helpers ───────────────────────────────────────────────────────────────

function getDevice(ua: string): string {
  if (/bot|crawler|spider|curl|wget|python/i.test(ua)) return "bot";
  if (/iPad|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  if (/Android|iPhone|iPod|Windows Phone|IEMobile/i.test(ua)) return "mobile";
  return "desktop";
}

function getOS(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Other";
}

function getBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua)) return "Safari";
  return "Other";
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
