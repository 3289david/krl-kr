/**
 * KRL.KR — Internal Analytics Click Recorder
 * POST /api/v1/internal/click?slug=...&ua=...&ip=...&country=...&...
 *
 * 엣지 워커가 리다이렉트 직후 ctx.waitUntil()로 비동기 호출하는 엔드포인트.
 * KV 캐시 히트/미스 관계없이 모든 클릭을 기록합니다.
 *
 * 인증: X-Worker-Secret 헤더
 * 쿼리파라미터: slug, ua, ip, country, city, region, referer, cache_hit
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/postgres";
import { generateId, md5 } from "@/lib/utils";

export const runtime = "nodejs";

function authorize(request: NextRequest): boolean {
  const secret = request.headers.get("x-worker-secret");
  return !!secret && secret === process.env.WORKER_SECRET;
}

// ─── POST /api/v1/internal/click ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const ua = searchParams.get("ua") ?? "";
  const ip = searchParams.get("ip") ?? "unknown";
  const country = searchParams.get("country") || null;
  const city = searchParams.get("city") || null;
  const region = searchParams.get("region") || null;
  const referer = searchParams.get("referer") || null;

  try {
    // 링크 ID 조회
    const link = await db
      .prepare("SELECT id FROM links WHERE slug = ? AND is_active = 1 LIMIT 1")
      .bind(slug)
      .first<{ id: string }>();

    if (!link) {
      return NextResponse.json({ recorded: false, reason: "not_found" });
    }

    const ipHash = await md5(ip);
    const now = Date.now();

    // 24시간 내 동일 IP → unique 여부 판단
    const existing = await db
      .prepare(
        "SELECT id FROM clicks WHERE link_id = ? AND ip_hash = ? AND clicked_at > ? LIMIT 1"
      )
      .bind(link.id, ipHash, now - 86_400_000)
      .first();

    const isUnique = !existing;

    // 브라우저/OS 파싱
    const browser = getBrowser(ua);
    const os = getOS(ua);
    const device = getDevice(ua);
    const refererDomain = referer ? extractDomain(referer) : null;

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
        link.id,
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
        .bind(link.id)
        .run();
    } else {
      await db
        .prepare("UPDATE links SET click_count = click_count + 1 WHERE id = ?")
        .bind(link.id)
        .run();
    }

    return NextResponse.json({ recorded: true, unique: isUnique });
  } catch (err) {
    console.error("[internal/click] Error:", err);
    // Analytics 실패는 무시 — 클라이언트에 영향 없음
    return NextResponse.json({ recorded: false, error: "db_error" });
  }
}

// ─── UA 파싱 헬퍼 ─────────────────────────────────────────────────────────────

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
