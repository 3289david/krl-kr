/**
 * KRL.KR — Subdomain Router
 * GET /api/v1/internal/sub?name=david
 *
 * Called internally by middleware for *.krl.kr requests.
 * - redirect / github / vercel / api → 302 to target
 * - html → serve stored HTML (if target looks like a URL, redirects instead)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/postgres";

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("https:/") || trimmed.startsWith("http:/")) {
    return `https://${trimmed.replace(/^https?:\/*/i, "")}`;
  }
  return `https://${trimmed}`;
}

/** Escape HTML special characters to prevent XSS in server-generated pages */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Returns true if the string looks like a URL rather than actual HTML */
function looksLikeUrl(str: string): boolean {
  const t = str.trim();
  return (
    t.startsWith("http://") ||
    t.startsWith("https://") ||
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+/.test(t)
  );
}

const NOT_FOUND_HTML = (name: string) => {
  const safeName = escapeHtml(name);
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeName}.krl.kr — 없는 주소</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;
justify-content:center;min-height:100vh;background:#f4f0e6;color:#1a1714}
.box{text-align:center;padding:48px 32px;max-width:480px}
.logo{font-family:monospace;font-weight:800;font-size:1.125rem;letter-spacing:-.02em;margin-bottom:32px;opacity:.6}
h1{font-size:1.375rem;font-weight:600;margin-bottom:10px}
p{color:rgba(26,23,20,.6);font-size:.9375rem;margin-bottom:28px;line-height:1.6}
a{display:inline-block;padding:10px 22px;background:#1a1714;color:#f4f0e6;
border-radius:9999px;text-decoration:none;font-size:.875rem;font-weight:500}
a:hover{opacity:.8}
</style>
</head>
<body><div class="box">
<div class="logo">KRL.KR</div>
<h1>${safeName}.krl.kr</h1>
<p>등록되지 않은 서브도메인입니다.<br>KRL.KR에서 직접 등록해보세요.</p>
<a href="https://krl.kr">krl.kr 바로가기</a>
</div></body></html>`;
};

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");

  if (!name) {
    return NextResponse.redirect(new URL("/", process.env.APP_URL ?? "https://krl.kr"));
  }

  try {
    const row = await db
      .prepare("SELECT target, type FROM subdomains WHERE subdomain = ? AND is_active = 1 LIMIT 1")
      .bind(name)
      .first<{ target: string; type: string }>();

    if (!row) {
      return new NextResponse(NOT_FOUND_HTML(name), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // a / aaaa / cname — DNS-only records, Cloudflare proxy is OFF.
    // Traffic should never reach this handler; the client connects directly
    // to the target IP or hostname via DNS. If we somehow get called, 404.
    if (row.type === "a" || row.type === "aaaa" || row.type === "cname") {
      return new NextResponse(NOT_FOUND_HTML(name), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // HTML type: serve the stored HTML directly.
    // But if the target looks like a URL (user accidentally entered a URL),
    // fall back to a redirect instead of serving the URL string as HTML.
    if (row.type === "html") {
      if (looksLikeUrl(row.target)) {
        return NextResponse.redirect(normalizeUrl(row.target), { status: 302 });
      }
      return new NextResponse(row.target, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // redirect / github / vercel / api → 302
    const target = normalizeUrl(row.target);
    return NextResponse.redirect(target, { status: 302 });

  } catch (err) {
    console.error("[/api/v1/internal/sub] DB error:", err);
    return NextResponse.redirect(new URL("/", process.env.APP_URL ?? "https://krl.kr"));
  }
}
