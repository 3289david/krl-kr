/**
 * KRL.KR — Subdomain Router
 * GET /api/v1/internal/sub?name=david
 *
 * Called internally by middleware for *.krl.kr requests.
 * - redirect / github / vercel / api → 302 to target
 * - html → serve stored HTML (if target looks like a URL, redirects instead)
 * - hosting → serve static files from disk
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/postgres";
import path from "path";
import fs from "fs";

const HOSTING_DIR = "/var/www/krl-kr/hosting";

const MIME_TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8",
  css: "text/css", js: "application/javascript", mjs: "application/javascript",
  json: "application/json", xml: "application/xml; charset=utf-8",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
  ico: "image/x-icon", avif: "image/avif",
  woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf",
  pdf: "application/pdf", txt: "text/plain; charset=utf-8",
  mp4: "video/mp4", webm: "video/webm", ogg: "audio/ogg", mp3: "audio/mpeg",
};

function getMime(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

function serveHostingFile(siteDir: string, requestPath: string): NextResponse {
  // Normalize path, prevent traversal
  const cleanPath = requestPath.split("?")[0];
  const relative = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\//, "");
  const safePath = path.resolve(siteDir, relative);

  if (!safePath.startsWith(siteDir)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Try exact file
  if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
    const buffer = fs.readFileSync(safePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": getMime(safePath),
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Try appending .html
  const withHtml = safePath + ".html";
  if (fs.existsSync(withHtml)) {
    const buffer = fs.readFileSync(withHtml);
    return new NextResponse(buffer, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  }

  // Try directory index.html
  const indexPath = path.join(safePath, "index.html");
  if (fs.existsSync(indexPath)) {
    const buffer = fs.readFileSync(indexPath);
    return new NextResponse(buffer, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  }

  // SPA fallback: serve root index.html for client-side routing
  const rootIndex = path.join(siteDir, "index.html");
  if (fs.existsSync(rootIndex)) {
    const buffer = fs.readFileSync(rootIndex);
    return new NextResponse(buffer, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" },
    });
  }

  return new NextResponse("Not Found", { status: 404 });
}

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

    // Check hosting sites if not found in subdomains
    if (!row) {
      try {
        const { getPool } = await import("@/lib/db/postgres");
        const pool = getPool();
        const hostingResult = await pool.query(
          "SELECT id FROM hosting_sites WHERE subdomain = $1 AND status = 'active' LIMIT 1",
          [name]
        );
        if (hostingResult.rows[0]) {
          const siteId = String(hostingResult.rows[0].id);
          const siteDir = path.join(HOSTING_DIR, siteId);
          const originalUri = request.headers.get("x-original-uri") ?? "/";
          return serveHostingFile(siteDir, originalUri);
        }
      } catch (e) {
        console.error("[sub] hosting lookup error:", e);
      }

      return new NextResponse(NOT_FOUND_HTML(name), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // a / aaaa / cname — reverse proxy to the target.
    // Nginx passes X-Original-URI so we can forward the full path + query.
    // Cloudflare terminates SSL, so we contact the target over plain HTTP (port 80).
    if (row.type === "a" || row.type === "aaaa" || row.type === "cname") {
      const originalUri = request.headers.get("x-original-uri") ?? "/";
      const subdomainHost = `${name}.krl.kr`;

      let targetHost: string;
      if (row.type === "cname") {
        targetHost = row.target.replace(/^https?:\/\//, "").split("/")[0].trim();
      } else {
        targetHost = row.target.trim();
      }

      // Try HTTPS first, fall back to HTTP (many self-hosted servers use HTTP internally)
      const tryUrls = [
        `http://${targetHost}${originalUri}`,
        `https://${targetHost}${originalUri}`,
      ];

      for (const proxyUrl of tryUrls) {
        try {
          const proxyRes = await fetch(proxyUrl, {
            method: "GET",
            headers: {
              "Host": subdomainHost,
              "X-Forwarded-For": request.headers.get("x-real-ip") ?? "",
              "X-Forwarded-Proto": "https",
              "X-Real-IP": request.headers.get("x-real-ip") ?? "",
              "User-Agent": request.headers.get("user-agent") ?? "krl.kr-proxy/1.0",
            },
            redirect: "follow",
            signal: AbortSignal.timeout(15000),
          });

          const responseHeaders = new Headers();
          proxyRes.headers.forEach((v, k) => {
            // Strip hop-by-hop headers
            if (!["transfer-encoding", "connection", "keep-alive",
                  "proxy-connection", "upgrade", "te", "trailers"].includes(k.toLowerCase())) {
              responseHeaders.set(k, v);
            }
          });
          responseHeaders.set("X-Proxied-By", "krl.kr");

          return new NextResponse(proxyRes.body, {
            status: proxyRes.status,
            statusText: proxyRes.statusText,
            headers: responseHeaders,
          });
        } catch {
          // Try next URL
          continue;
        }
      }

      // Both HTTP and HTTPS failed
      const errHtml = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${escapeHtml(name)}.krl.kr — 연결 실패</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;
min-height:100vh;background:#f4f0e6;color:#1a1714;margin:0}
.box{text-align:center;padding:48px 32px;max-width:480px}
.logo{font-family:monospace;font-weight:800;font-size:1.125rem;margin-bottom:32px;opacity:.6}
h1{font-size:1.375rem;font-weight:600;margin-bottom:10px}
p{color:rgba(26,23,20,.6);font-size:.9375rem;margin-bottom:8px;line-height:1.6}
code{background:#e5e0d6;padding:2px 6px;border-radius:4px;font-size:.875rem}
a{display:inline-block;margin-top:20px;padding:10px 22px;background:#1a1714;color:#f4f0e6;
border-radius:9999px;text-decoration:none;font-size:.875rem;font-weight:500}</style>
</head><body><div class="box">
<div class="logo">KRL.KR</div>
<h1>서버에 연결할 수 없습니다</h1>
<p><code>${escapeHtml(targetHost)}</code> 서버가 응답하지 않습니다.</p>
<p>대상 서버가 실행 중인지, 포트 80/443이 열려 있는지 확인하세요.</p>
<a href="https://krl.kr">krl.kr 바로가기</a>
</div></body></html>`;
      return new NextResponse(errHtml, {
        status: 502,
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
