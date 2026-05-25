/**
 * KRL.KR — Internal Edge-Worker Lookup API
 * GET /api/v1/internal/lookup?slug=<slug>
 *
 * 엣지 워커(worker/index.ts)가 호출하는 내부 전용 엔드포인트.
 * 슬러그에 대한 리다이렉트 URL을 반환합니다.
 * Analytics 기록은 /api/v1/internal/click 에서 처리합니다.
 *
 * 인증: X-Worker-Secret 헤더
 *
 * 응답:
 *   { redirect_url: string }              → 엣지에서 302 리다이렉트
 *   { pass_through: true, reason: string } → Next.js 원본으로 패스스루
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/postgres";
import { isExpired } from "@/lib/utils";

export const runtime = "nodejs";

function authorize(request: NextRequest): boolean {
  const secret = request.headers.get("x-worker-secret");
  return !!secret && secret === process.env.WORKER_SECRET;
}

function passThrough(reason: string) {
  return NextResponse.json({ pass_through: true, reason }, { status: 200 });
}

// ─── GET /api/v1/internal/lookup ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) return passThrough("no_slug");

  // ── 링크 조회 ──────────────────────────────────────────────────────────────
  let link: {
    id: string;
    original_url: string;
    password_hash: string | null;
    expires_at: number | null;
    max_clicks: number | null;
    click_count: number;
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
                click_count, ios_url, android_url,
                geo_rules, device_rules, utm_source, utm_medium, utm_campaign
         FROM links WHERE slug = ? AND is_active = 1 LIMIT 1`
      )
      .bind(slug)
      .first();
  } catch (err) {
    console.error("[internal/lookup] DB error:", err);
    return passThrough("db_error");
  }

  if (!link) return passThrough("not_found");
  if (isExpired(link.expires_at)) return passThrough("expired");
  if (link.max_clicks !== null && link.click_count >= link.max_clicks)
    return passThrough("max_clicks");
  if (link.password_hash) return passThrough("password_required");

  // ── 리다이렉트 URL 결정 ───────────────────────────────────────────────────
  // (방문자 UA/IP는 /click 엔드포인트에서 처리하므로 여기서는 원본 URL만 반환)
  let targetUrl = link.original_url;

  // UTM 파라미터 추가
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
      // URL 파싱 실패 시 원본 사용
    }
  }

  return NextResponse.json({ redirect_url: targetUrl }, { status: 200 });
}
