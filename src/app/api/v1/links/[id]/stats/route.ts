import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDB(request);
  if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const link = await db
    .prepare("SELECT id, click_count, unique_count FROM links WHERE id = ? AND user_id = ? LIMIT 1")
    .bind(id, user.id)
    .first<{ id: string; click_count: number; unique_count: number }>();

  if (!link) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(365, Math.max(1, parseInt(searchParams.get("days") ?? "30", 10)));
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  const [totalResult, uniqueResult, byDayResult, byCountryResult, byDeviceResult, byBrowserResult, byRefererResult] =
    await Promise.all([
      db
        .prepare("SELECT COUNT(*) as count FROM clicks WHERE link_id = ? AND clicked_at >= ?")
        .bind(id, since)
        .first<{ count: number }>(),
      db
        .prepare("SELECT COUNT(DISTINCT ip_hash) as count FROM clicks WHERE link_id = ? AND clicked_at >= ?")
        .bind(id, since)
        .first<{ count: number }>(),
      db
        .prepare(
          `SELECT date(clicked_at / 1000, 'unixepoch') as date, COUNT(*) as count
           FROM clicks WHERE link_id = ? AND clicked_at >= ?
           GROUP BY date ORDER BY date ASC LIMIT ?`
        )
        .bind(id, since, days)
        .all<{ date: string; count: number }>(),
      db
        .prepare(
          `SELECT COALESCE(country, '알 수 없음') as country, COUNT(*) as count
           FROM clicks WHERE link_id = ? AND clicked_at >= ?
           GROUP BY country ORDER BY count DESC LIMIT 10`
        )
        .bind(id, since)
        .all<{ country: string; count: number }>(),
      db
        .prepare(
          `SELECT COALESCE(device_type, '알 수 없음') as device_type, COUNT(*) as count
           FROM clicks WHERE link_id = ? AND clicked_at >= ?
           GROUP BY device_type ORDER BY count DESC`
        )
        .bind(id, since)
        .all<{ device_type: string; count: number }>(),
      db
        .prepare(
          `SELECT COALESCE(browser, '알 수 없음') as browser, COUNT(*) as count
           FROM clicks WHERE link_id = ? AND clicked_at >= ?
           GROUP BY browser ORDER BY count DESC LIMIT 5`
        )
        .bind(id, since)
        .all<{ browser: string; count: number }>(),
      db
        .prepare(
          `SELECT COALESCE(referer_domain, '직접 접속') as referer_domain, COUNT(*) as count
           FROM clicks WHERE link_id = ? AND clicked_at >= ?
           GROUP BY referer_domain ORDER BY count DESC LIMIT 5`
        )
        .bind(id, since)
        .all<{ referer_domain: string; count: number }>(),
    ]);

  return NextResponse.json({
    total: totalResult?.count ?? 0,
    unique: uniqueResult?.count ?? 0,
    byDay: byDayResult.results,
    byCountry: byCountryResult.results,
    byDevice: byDeviceResult.results,
    byBrowser: byBrowserResult.results,
    byReferer: byRefererResult.results,
  });
}
