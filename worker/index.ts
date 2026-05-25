/**
 * KRL.KR — Cloudflare Edge Redirect Worker
 *
 * Intercepts slug requests at the Cloudflare edge and resolves them
 * by calling the KRL.KR VPS API. This means redirects are served from
 * Cloudflare's global network without a round-trip to the VPS for the
 * client — only the worker→VPS lookup happens at the edge.
 *
 * Architecture:
 *   Browser → CF Edge Worker → (lookup) VPS API → redirect URL
 *                                                 ↳ Browser redirected
 *
 * If the lookup fails or the link needs special handling (password,
 * expired, etc.), the request is passed through to the Next.js origin.
 *
 * Deploy:
 *   wrangler deploy                       (uses wrangler.toml)
 *
 * Secrets (set once, never commit):
 *   wrangler secret put APP_URL
 *   wrangler secret put WORKER_SECRET
 */

import type { ExecutionContext } from "@cloudflare/workers-types";

export interface Env {
  /** VPS origin — e.g. https://krl.kr */
  APP_URL: string;
  /** Shared secret authenticating worker→API calls */
  WORKER_SECRET: string;
}

// ─── Paths that should always pass through to Next.js ────────────────────────
const BYPASS_EXACT = new Set([
  "/",
  "/dashboard",
  "/login",
  "/register",
  "/logout",
  "/features",
  "/pricing",
  "/about",
  "/docs",
  "/blog",
  "/changelog",
  "/status",
  "/contact",
  "/support",
  "/qr",
  "/tools",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.json",
  "/manifest.webmanifest",
]);

const BYPASS_PREFIXES = [
  "/api/",
  "/_next/",
  "/dashboard/",
  "/legal/",
  "/tools/",
  "/bio/",
  "/f/",       // file download
  "/p/",       // paste view
  "/qr/",      // QR viewer
];

function shouldBypass(pathname: string): boolean {
  if (BYPASS_EXACT.has(pathname)) return true;
  for (const prefix of BYPASS_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  // Static assets
  if (pathname.includes(".")) return true;
  return false;
}

// ─── Worker fetch handler ─────────────────────────────────────────────────────
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // ── 1. Bypass check ───────────────────────────────────────────────────────
    if (shouldBypass(pathname)) {
      return fetch(request); // pass to origin
    }

    // ── 2. Extract slug ───────────────────────────────────────────────────────
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length !== 1) {
      // Sub-paths are handled by Next.js (e.g. /abc/locked)
      return fetch(request);
    }
    const slug = segments[0];

    // ── 3. Ask VPS for redirect info ──────────────────────────────────────────
    // Gather visitor context so VPS can record analytics without a second call.
    const ua = request.headers.get("user-agent") ?? "";
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for") ??
      "unknown";
    const country = request.headers.get("cf-ipcountry") ?? "";
    const city = request.headers.get("cf-ipcity") ?? "";
    const region = request.headers.get("cf-region") ?? "";
    const referer = request.headers.get("referer") ?? "";

    const lookupParams = new URLSearchParams({
      slug,
      ua,
      ip,
      country,
      city,
      region,
      referer,
    });

    let redirectUrl: string | null = null;

    try {
      const lookupResp = await fetch(
        `${env.APP_URL}/api/v1/internal/lookup?${lookupParams}`,
        {
          method: "GET",
          headers: {
            "X-Worker-Secret": env.WORKER_SECRET,
            "User-Agent": "KRL.KR-EdgeWorker/1.0",
          },
          // CF: don't cache internally — caching is handled by the VPS response headers
          cf: { cacheEverything: false },
        } as RequestInit & { cf?: Record<string, unknown> }
      );

      if (lookupResp.ok) {
        const data = (await lookupResp.json()) as
          | { redirect_url: string }
          | { pass_through: true; reason: string };

        if ("redirect_url" in data && data.redirect_url) {
          redirectUrl = data.redirect_url;
        }
        // If pass_through — fall through to origin below
      }
    } catch (err) {
      // VPS unreachable → pass through so Next.js can handle or show error
      console.error("[edge-worker] Lookup failed:", err);
    }

    // ── 4. Redirect at the edge ───────────────────────────────────────────────
    if (redirectUrl) {
      return Response.redirect(redirectUrl, 302);
    }

    // ── 5. Pass through to Next.js origin ────────────────────────────────────
    return fetch(request);
  },
};
