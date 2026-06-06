import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!code) return NextResponse.redirect(new URL("/", request.url));

  try {
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const result = await pool.query("SELECT * FROM short_urls WHERE code = $1 AND active = TRUE", [code]);
    const su = result.rows[0];
    if (!su) {
      return new NextResponse(`<html><body><p>링크를 찾을 수 없습니다. <a href="/">홈으로</a></p></body></html>`, {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Record click asynchronously
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const ua = request.headers.get("user-agent") ?? "";
    const ref = request.headers.get("referer") ?? "";

    pool.query(
      "INSERT INTO short_url_clicks (url_id, ip, user_agent, referer, clicked_at) VALUES ($1, $2, $3, $4, $5)",
      [su.id, ip, ua, ref, Date.now()]
    ).then(() => pool.query("UPDATE short_urls SET clicks = clicks + 1 WHERE id = $1", [su.id])).catch(() => {});

    return NextResponse.redirect(su.target_url, { status: 302 });
  } catch (err) {
    console.error("[go/code]", err);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
