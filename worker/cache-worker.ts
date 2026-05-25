/**
 * KRL.KR — Cache Management Worker
 *
 * URL: https://krl-kr-cache.rukkit.workers.dev
 *
 * VPS의 링크 수정/삭제 API가 이 워커를 호출해 엣지 KV 캐시를 무효화합니다.
 * krl-kr-edge 워커와 동일한 KV 네임스페이스를 공유합니다.
 *
 * 엔드포인트 (모두 X-Worker-Secret 헤더 필요):
 *   POST /invalidate  { slugs: string[] }          → KV에서 슬러그 삭제
 *   POST /set         { slug, redirect_url }        → KV에 캐시 등록 (워밍)
 *   DELETE /flush                                   → KV 전체 삭제 (비상용)
 *   GET  /health                                    → 헬스체크
 *
 * 배포: wrangler deploy --config wrangler.cache.toml
 */

import type { KVNamespace, ExecutionContext } from "@cloudflare/workers-types";

export interface CacheEnv {
  URL_CACHE: KVNamespace;
  WORKER_SECRET: string;
}

/** KV에 저장되는 캐시 데이터 구조 */
export interface CacheEntry {
  redirect_url: string;
  cached_at: number;
}

const KV_PREFIX = "link:";
const DEFAULT_TTL = 60; // seconds

export default {
  async fetch(
    request: Request,
    env: CacheEnv,
    _ctx: ExecutionContext
  ): Promise<Response> {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const secret = request.headers.get("x-worker-secret");
    if (!secret || secret !== env.WORKER_SECRET) {
      return json({ error: "Unauthorized" }, 401);
    }

    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const path = url.pathname;

    // ── GET /health ───────────────────────────────────────────────────────────
    if (method === "GET" && path === "/health") {
      return json({
        status: "ok",
        worker: "krl-kr-cache",
        url: "https://krl-kr-cache.rukkit.workers.dev",
        timestamp: new Date().toISOString(),
      });
    }

    // ── POST /invalidate ──────────────────────────────────────────────────────
    // Body: { slugs: string[] }
    // 주어진 슬러그들을 KV에서 삭제합니다.
    if (method === "POST" && path === "/invalidate") {
      let body: { slugs?: unknown };
      try {
        body = await request.json() as { slugs?: unknown };
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }

      if (!Array.isArray(body.slugs) || body.slugs.length === 0) {
        return json({ error: "slugs 배열이 필요합니다." }, 400);
      }

      const slugs = body.slugs as string[];
      const deleted: string[] = [];
      const errors: string[] = [];

      await Promise.allSettled(
        slugs.map(async (slug) => {
          try {
            await env.URL_CACHE.delete(`${KV_PREFIX}${slug}`);
            deleted.push(slug);
          } catch (err) {
            errors.push(`${slug}: ${String(err)}`);
          }
        })
      );

      return json({
        success: true,
        deleted,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // ── POST /set ─────────────────────────────────────────────────────────────
    // Body: { slug: string, redirect_url: string, ttl?: number }
    // 특정 슬러그를 KV에 미리 등록합니다 (캐시 워밍).
    if (method === "POST" && path === "/set") {
      let body: { slug?: unknown; redirect_url?: unknown; ttl?: unknown };
      try {
        body = await request.json() as typeof body;
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }

      if (typeof body.slug !== "string" || !body.slug) {
        return json({ error: "slug 필드가 필요합니다." }, 400);
      }
      if (typeof body.redirect_url !== "string" || !body.redirect_url) {
        return json({ error: "redirect_url 필드가 필요합니다." }, 400);
      }

      const ttl =
        typeof body.ttl === "number" && body.ttl > 0
          ? body.ttl
          : DEFAULT_TTL;

      const entry: CacheEntry = {
        redirect_url: body.redirect_url,
        cached_at: Date.now(),
      };

      await env.URL_CACHE.put(
        `${KV_PREFIX}${body.slug}`,
        JSON.stringify(entry),
        { expirationTtl: ttl }
      );

      return json({
        success: true,
        slug: body.slug,
        ttl,
        entry,
      });
    }

    // ── DELETE /flush ─────────────────────────────────────────────────────────
    // 전체 KV 캐시를 비웁니다 (비상 상황에만 사용).
    if (method === "DELETE" && path === "/flush") {
      const keys = await env.URL_CACHE.list({ prefix: KV_PREFIX });
      const deleted: string[] = [];

      await Promise.allSettled(
        keys.keys.map(async (k) => {
          await env.URL_CACHE.delete(k.name);
          deleted.push(k.name);
        })
      );

      return json({ success: true, flushed: deleted.length, keys: deleted });
    }

    return json({ error: "Not Found" }, 404);
  },
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
