/**
 * KRL.KR — Edge Redirect Worker
 *
 * URL: https://krl-kr-edge.rukkit.workers.dev
 *      https://krl.kr/* (production route)
 *
 * 동작 순서:
 *   1. Bypass 경로면 Next.js 원본 서버로 패스스루
 *   2. KV 캐시 확인 → 히트: 즉시 리다이렉트 + 비동기 analytics 기록
 *   3. KV 미스: VPS /api/v1/internal/lookup 호출
 *      → 결과 KV에 캐시 (60초) + 리다이렉트 + 비동기 analytics 기록
 *   4. pass_through / 오류: Next.js 원본으로 패스스루
 *
 * 배포: wrangler deploy
 * 시크릿: wrangler secret put WORKER_SECRET
 */

import type { KVNamespace, ExecutionContext } from "@cloudflare/workers-types";

export interface Env {
  /** VPS 원본 URL — https://krl.kr */
  APP_URL: string;
  /** VPS API와 공유하는 인증 시크릿 */
  WORKER_SECRET: string;
  /** URL 리다이렉트 캐시 (krl-kr-cache 워커와 공유) */
  URL_CACHE: KVNamespace;
}

/** KV에 저장되는 캐시 데이터 */
interface CacheEntry {
  redirect_url: string;
  cached_at: number;
}

// ─── KV 캐시 TTL ──────────────────────────────────────────────────────────────
const CACHE_TTL_SECONDS = 60;
const KV_PREFIX = "link:";

// ─── Bypass 경로 목록 ─────────────────────────────────────────────────────────
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
  "/f/",    // 파일 다운로드
  "/p/",    // 페이스트 뷰
  "/qr/",   // QR 뷰어
];

function shouldBypass(pathname: string): boolean {
  if (BYPASS_EXACT.has(pathname)) return true;
  for (const prefix of BYPASS_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  // 정적 파일 (확장자 있는 경로)
  if (pathname.includes(".")) return true;
  return false;
}

// ─── 메인 fetch 핸들러 ────────────────────────────────────────────────────────
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // ── 1. Bypass ─────────────────────────────────────────────────────────────
    if (shouldBypass(pathname)) {
      return fetch(request);
    }

    // ── 2. 슬러그 추출 ────────────────────────────────────────────────────────
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length !== 1) {
      // 서브경로 (예: /abc/locked) → Next.js 처리
      return fetch(request);
    }
    const slug = segments[0];

    // ── 3. 방문자 정보 수집 (analytics용) ────────────────────────────────────
    const ua = request.headers.get("user-agent") ?? "";
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for") ??
      "unknown";
    const country = request.headers.get("cf-ipcountry") ?? "";
    const city = request.headers.get("cf-ipcity") ?? "";
    const region = request.headers.get("cf-region") ?? "";
    const referer = request.headers.get("referer") ?? "";

    // ── 4. KV 캐시 확인 ───────────────────────────────────────────────────────
    let redirectUrl: string | null = null;
    let cacheHit = false;

    try {
      const cached = await env.URL_CACHE.get<CacheEntry>(
        `${KV_PREFIX}${slug}`,
        "json"
      );
      if (cached?.redirect_url) {
        redirectUrl = cached.redirect_url;
        cacheHit = true;
      }
    } catch {
      // KV 오류 → VPS로 폴백
    }

    // ── 5. KV 미스: VPS /api/v1/internal/lookup 호출 ──────────────────────────
    if (!redirectUrl) {
      const lookupParams = new URLSearchParams({ slug });

      try {
        const lookupResp = await fetch(
          `${env.APP_URL}/api/v1/internal/lookup?${lookupParams}`,
          {
            method: "GET",
            headers: {
              "X-Worker-Secret": env.WORKER_SECRET,
              "User-Agent": "KRL.KR-EdgeWorker/1.0",
            },
          }
        );

        if (lookupResp.ok) {
          const data = (await lookupResp.json()) as
            | { redirect_url: string }
            | { pass_through: true; reason: string };

          if ("redirect_url" in data && data.redirect_url) {
            redirectUrl = data.redirect_url;

            // KV에 캐시 저장 (비동기 — 리다이렉트를 블로킹하지 않음)
            const entry: CacheEntry = {
              redirect_url: redirectUrl,
              cached_at: Date.now(),
            };
            ctx.waitUntil(
              env.URL_CACHE.put(
                `${KV_PREFIX}${slug}`,
                JSON.stringify(entry),
                { expirationTtl: CACHE_TTL_SECONDS }
              )
            );
          }
          // pass_through → Next.js로 전달 (아래에서 처리)
        }
      } catch (err) {
        console.error("[edge-worker] VPS lookup failed:", err);
        // VPS 오류 → Next.js 패스스루
      }
    }

    // ── 6. Analytics 비동기 기록 ─────────────────────────────────────────────
    // 캐시 히트/미스 관계없이 항상 analytics 기록
    if (redirectUrl) {
      const analyticsParams = new URLSearchParams({
        slug,
        ua,
        ip,
        country,
        city,
        region,
        referer,
        cache_hit: cacheHit ? "1" : "0",
      });

      ctx.waitUntil(
        fetch(
          `${env.APP_URL}/api/v1/internal/click?${analyticsParams}`,
          {
            method: "POST",
            headers: {
              "X-Worker-Secret": env.WORKER_SECRET,
              "User-Agent": "KRL.KR-EdgeWorker/1.0",
              "Content-Length": "0",
            },
          }
        ).catch(() => {
          // analytics 실패 시 무시 — 리다이렉트에 영향 없음
        })
      );
    }

    // ── 7. 리다이렉트 또는 패스스루 ───────────────────────────────────────────
    if (redirectUrl) {
      return Response.redirect(redirectUrl, 302);
    }

    // 링크 없음 / pass_through → Next.js가 404, 만료 등 처리
    return fetch(request);
  },
};
