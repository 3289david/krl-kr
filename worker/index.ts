/**
 * KRL.KR — Cloudflare Edge Worker
 * Handles URL redirects at the edge with D1 + KV cache
 *
 * Architecture:
 * 1. Check KV cache first (microsecond latency)
 * 2. If miss, query D1 database
 * 3. Record analytics asynchronously
 * 4. Store in KV cache for future requests
 *
 * This worker runs on ALL Cloudflare edge nodes globally,
 * providing sub-5ms redirect latency worldwide.
 */
import type { D1Database, KVNamespace, R2Bucket, ExecutionContext } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
  URL_CACHE: KVNamespace;
  STORAGE: R2Bucket;
  APP_URL: string;
  JWT_SECRET: string;
}

interface CachedLink {
  id: string;
  original_url: string;
  password_hash: string | null;
  expires_at: number | null;
  max_clicks: number | null;
  click_count: number;
  is_active: number;
  geo_rules: string | null;
  device_rules: string | null;
  ios_url: string | null;
  android_url: string | null;
}

// Paths that should not be treated as slugs
const BYPASS_PATHS = new Set([
  "/", "/dashboard", "/login", "/register", "/logout",
  "/api", "/features", "/pricing", "/about", "/docs",
  "/blog", "/changelog", "/status", "/contact",
  "/legal", "/qr", "/tools", "/favicon.ico",
  "/robots.txt", "/sitemap.xml", "/manifest.json",
]);

function shouldBypass(pathname: string): boolean {
  if (BYPASS_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/dashboard/")) return true;
  if (pathname.startsWith("/legal/")) return true;
  if (pathname.startsWith("/tools/")) return true;
  if (pathname.startsWith("/@")) return true; // Link-in-bio
  return false;
}

function getDeviceType(ua: string): "mobile" | "tablet" | "desktop" | "bot" {
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

function getRefererDomain(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function generateId(): Promise<string> {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 32);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // Let non-slug paths pass through to Next.js (or return 404 for workers-only)
    if (shouldBypass(pathname)) {
      // Pass to origin (Pages/Next.js)
      return fetch(request);
    }

    // Extract slug (first path segment, no subpaths)
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return fetch(request);
    }

    const slug = segments[0];

    // Sub-path routes — pass through
    if (segments.length > 1) {
      return fetch(request);
    }

    // ── 1. Check KV cache ─────────────────────────────────────────────────────
    const cacheKey = `link:${slug}`;
    let link: CachedLink | null = null;

    try {
      const cached = await env.URL_CACHE.get(cacheKey, "json") as CachedLink | null;
      if (cached) {
        link = cached;
      }
    } catch {
      // Cache miss or error — fall through to DB
    }

    // ── 2. Query D1 if cache miss ─────────────────────────────────────────────
    if (!link) {
      try {
        link = await env.DB
          .prepare(
            `SELECT id, original_url, password_hash, expires_at, max_clicks,
                    click_count, is_active, geo_rules, device_rules, ios_url, android_url
             FROM links WHERE slug = ? AND is_active = 1 LIMIT 1`
          )
          .bind(slug)
          .first<CachedLink>();

        if (link) {
          // Cache for 60 seconds (dynamic links might change)
          ctx.waitUntil(
            env.URL_CACHE.put(cacheKey, JSON.stringify(link), {
              expirationTtl: link.is_active ? 60 : 5,
            })
          );
        }
      } catch (err) {
        console.error("DB error:", err);
        // If DB is down, redirect to home page
        return Response.redirect(env.APP_URL, 302);
      }
    }

    // ── 3. Not found ──────────────────────────────────────────────────────────
    if (!link) {
      // Pass to Next.js for custom 404 page
      return fetch(request);
    }

    // ── 4. Check if expired ───────────────────────────────────────────────────
    if (link.expires_at && Date.now() > link.expires_at) {
      return fetch(request); // Let Next.js render expired page
    }

    // ── 5. Check max clicks ───────────────────────────────────────────────────
    if (link.max_clicks !== null && link.click_count >= link.max_clicks) {
      return fetch(request); // Let Next.js render max-clicks page
    }

    // ── 6. Check password ─────────────────────────────────────────────────────
    if (link.password_hash) {
      const providedPassword = url.searchParams.get("p");
      if (!providedPassword) {
        // Redirect to password entry page (handled by Next.js)
        return fetch(request);
      }
      // Let Next.js verify the password
      return fetch(request);
    }

    // ── 7. Determine target URL ───────────────────────────────────────────────
    let targetUrl = link.original_url;

    const ua = request.headers.get("User-Agent") ?? "";
    const os = getOS(ua);
    const device = getDeviceType(ua);

    // App links (iOS/Android)
    if (os === "iOS" && link.ios_url) {
      targetUrl = link.ios_url;
    } else if (os === "Android" && link.android_url) {
      targetUrl = link.android_url;
    } else {
      // Geo-based redirect using Cloudflare CF-IPCountry header
      const country = request.headers.get("CF-IPCountry") ?? null;

      if (link.geo_rules && country) {
        try {
          const rules = JSON.parse(link.geo_rules) as Array<{ country: string; url: string }>;
          const geoRule = rules.find(
            (r) => r.country.toUpperCase() === country.toUpperCase()
          );
          if (geoRule?.url) {
            targetUrl = geoRule.url;
          }
        } catch {
          // Invalid JSON
        }
      }

      // Device-based redirect
      if (link.device_rules) {
        try {
          const rules = JSON.parse(link.device_rules) as Array<{ device: string; url: string }>;
          const deviceRule = rules.find((r) => r.device === device);
          if (deviceRule?.url) {
            targetUrl = deviceRule.url;
          }
        } catch {
          // Invalid JSON
        }
      }
    }

    // ── 8. Record analytics (non-blocking) ───────────────────────────────────
    ctx.waitUntil(
      recordAnalytics(env, link, request, device, os, country(request))
    );

    // ── 9. Redirect ───────────────────────────────────────────────────────────
    return Response.redirect(targetUrl, 302);
  },
};

function country(request: Request): string | null {
  return request.headers.get("CF-IPCountry");
}

async function recordAnalytics(
  env: Env,
  link: CachedLink,
  request: Request,
  device: string,
  os: string,
  cf_country: string | null
): Promise<void> {
  try {
    const ip =
      request.headers.get("CF-Connecting-IP") ??
      request.headers.get("X-Forwarded-For") ??
      "unknown";

    const ua = request.headers.get("User-Agent") ?? "";
    const referer = request.headers.get("Referer");
    const city = request.headers.get("CF-IPCity");
    const region = request.headers.get("CF-Region");
    const browser = getBrowser(ua);
    const ipHash = await hashIp(ip);
    const refererDomain = getRefererDomain(referer);
    const now = Date.now();
    const clickId = await generateId();

    // Check uniqueness (last 24h from same IP)
    const existing = await env.DB
      .prepare(
        "SELECT id FROM clicks WHERE link_id = ? AND ip_hash = ? AND clicked_at > ? LIMIT 1"
      )
      .bind(link.id, ipHash, now - 86400000)
      .first();

    const isUnique = !existing;

    // Insert click record
    await env.DB
      .prepare(
        `INSERT INTO clicks (
          id, link_id, clicked_at, country, city, region,
          device_type, browser, os, referer, referer_domain, user_agent, ip_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        clickId, link.id, now,
        cf_country, city, region,
        device, browser, os,
        referer, refererDomain,
        ua.substring(0, 500), ipHash
      )
      .run();

    // Update click counters
    if (isUnique) {
      await env.DB
        .prepare(
          "UPDATE links SET click_count = click_count + 1, unique_count = unique_count + 1 WHERE id = ?"
        )
        .bind(link.id)
        .run();
    } else {
      await env.DB
        .prepare("UPDATE links SET click_count = click_count + 1 WHERE id = ?")
        .bind(link.id)
        .run();
    }

    // Invalidate KV cache so next request gets fresh click count
    await env.URL_CACHE.delete(`link:${link.id}`);
  } catch (err) {
    console.error("Analytics error:", err);
    // Don't throw — analytics failure should not break redirects
  }
}
