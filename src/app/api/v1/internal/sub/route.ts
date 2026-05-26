/**
 * KRL.KR — Subdomain Redirect Handler
 * GET /api/v1/internal/sub?name=david
 *
 * Called internally by middleware for *.krl.kr subdomain requests.
 * - redirect/github/vercel/api → 302 redirect to target
 * - html → serve stored HTML content directly
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/postgres";

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  // Already has valid protocol
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  // Has protocol but malformed (e.g. "https:/foo" with single slash)
  if (trimmed.startsWith("https:/") || trimmed.startsWith("http:/")) {
    // Strip whatever partial protocol and re-add https://
    const withoutProto = trimmed.replace(/^https?:\/*/i, "");
    return `https://${withoutProto}`;
  }
  return `https://${trimmed}`;
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");

  if (!name) {
    return NextResponse.redirect(new URL("/", process.env.APP_URL ?? "https://krl.kr"));
  }

  try {
    const row = await db
      .prepare(
        "SELECT target, type FROM subdomains WHERE subdomain = ? AND is_active = 1"
      )
      .bind(name)
      .first<{ target: string; type: string }>();

    if (!row) {
      // Subdomain not registered — show 404 page
      return new NextResponse(
        `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${name}.krl.kr — 없는 주소</title>
        <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#F3F0EE}
        .box{text-align:center}.logo{font-family:monospace;font-weight:700;font-size:1.25rem;margin-bottom:24px}
        h1{font-size:1.5rem;font-weight:600;margin-bottom:8px}p{color:#696969;margin-bottom:24px}
        a{display:inline-block;padding:10px 20px;background:#141413;color:#F3F0EE;border-radius:9999px;text-decoration:none;font-size:.875rem}</style>
        </head><body><div class="box"><div class="logo">KRL.KR</div>
        <h1>${name}.krl.kr</h1><p>등록되지 않은 서브도메인입니다.</p>
        <a href="https://krl.kr">krl.kr로 돌아가기</a></div></body></html>`,
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // HTML type — serve the HTML content directly
    if (row.type === "html") {
      return new NextResponse(row.target, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // All other types (redirect, github, vercel, api) — 302 redirect
    const target = normalizeUrl(row.target);
    return NextResponse.redirect(target, { status: 302 });

  } catch (err) {
    console.error("[/api/v1/internal/sub] DB error:", err);
    return NextResponse.redirect(new URL("/", process.env.APP_URL ?? "https://krl.kr"));
  }
}
