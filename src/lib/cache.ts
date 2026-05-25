/**
 * KRL.KR — Edge Cache Invalidation Helper
 *
 * VPS가 링크를 수정/삭제할 때 krl-kr-cache 워커를 호출해
 * KV 캐시를 무효화합니다.
 *
 * 사용:
 *   import { invalidateSlug } from "@/lib/cache";
 *   await invalidateSlug("abc123"); // 또는 여러 개: invalidateSlugs(["abc", "def"])
 */

const CACHE_WORKER_URL = process.env.CACHE_WORKER_URL ?? "";
const WORKER_SECRET = process.env.WORKER_SECRET ?? "";

/**
 * 단일 슬러그를 엣지 KV 캐시에서 삭제합니다.
 * CACHE_WORKER_URL이 설정되지 않은 경우 무시합니다.
 */
export async function invalidateSlug(slug: string): Promise<void> {
  return invalidateSlugs([slug]);
}

/**
 * 여러 슬러그를 엣지 KV 캐시에서 한꺼번에 삭제합니다.
 */
export async function invalidateSlugs(slugs: string[]): Promise<void> {
  if (!CACHE_WORKER_URL || !WORKER_SECRET || slugs.length === 0) return;

  try {
    const resp = await fetch(`${CACHE_WORKER_URL}/invalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": WORKER_SECRET,
      },
      body: JSON.stringify({ slugs }),
    });

    if (!resp.ok) {
      console.warn(
        `[cache] invalidate failed (${resp.status}):`,
        await resp.text().catch(() => "")
      );
    }
  } catch (err) {
    // 캐시 무효화 실패는 심각한 오류가 아님 (TTL로 자동 만료)
    console.warn("[cache] invalidate error:", err);
  }
}

/**
 * 슬러그를 캐시에 미리 등록합니다 (캐시 워밍).
 * 링크 생성 직후 호출하면 첫 방문부터 캐시 히트가 됩니다.
 */
export async function warmCache(
  slug: string,
  redirectUrl: string,
  ttl = 60
): Promise<void> {
  if (!CACHE_WORKER_URL || !WORKER_SECRET) return;

  try {
    await fetch(`${CACHE_WORKER_URL}/set`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": WORKER_SECRET,
      },
      body: JSON.stringify({ slug, redirect_url: redirectUrl, ttl }),
    });
  } catch (err) {
    console.warn("[cache] warm error:", err);
  }
}
