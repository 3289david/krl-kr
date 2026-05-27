/**
 * KRL.KR — Edge Middleware
 *
 * NOTE: *.krl.kr subdomain routing is handled at the nginx level.
 * nginx captures the subdomain name and proxies directly to
 * /api/v1/internal/sub?name=<subdomain> with Host: krl.kr.
 * No middleware subdomain handling needed here.
 *
 * This middleware handles:
 * 1. CORS preflight for API routes
 * 2. @username → /bio/username rewrites
 * 3. Short link slug pass-through with geo headers
 */
import { NextRequest, NextResponse } from "next/server";

// Paths that should NOT be treated as short link slugs
const RESERVED_PATHS = new Set([
  "",
  "dashboard",
  "login",
  "register",
  "logout",
  "api",
  "features",
  "pricing",
  "about",
  "docs",
  "blog",
  "changelog",
  "status",
  "contact",
  "legal",
  "qr",
  "tools",
  "f",
  "p",
  "bio",
  "community",
  "new",
  "support",
  "_next",
  "favicon.ico",
  "icon.svg",
  "manifest.json",
  "robots.txt",
  "sitemap.xml",
  "og-image.png",
  "apple-icon.png",
  "apple-touch-icon.png",
  "llms.txt",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Max-Age": "86400",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── CORS preflight ──────────────────────────────────────────────────────────
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  // ── Skip API routes, static files ──────────────────────────────────────────
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/")
  ) {
    return NextResponse.next();
  }

  // ── Short link & @username routing ─────────────────────────────────────────
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return NextResponse.next();

  const firstSegment = segments[0];

  if (RESERVED_PATHS.has(firstSegment)) {
    return NextResponse.next();
  }

  // @username → /bio/username (link-in-bio public pages)
  if (firstSegment.startsWith("@")) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/bio/${firstSegment.slice(1)}${
      segments.length > 1 ? "/" + segments.slice(1).join("/") : ""
    }`;
    return NextResponse.rewrite(rewriteUrl);
  }

  // Short link slug — pass through to [slug] page with CF geo headers
  const response = NextResponse.next();
  const cfCountry = request.headers.get("cf-ipcountry");
  const cfCity = request.headers.get("cf-ipcity");
  const cfRegion = request.headers.get("cf-region");
  if (cfCountry) response.headers.set("x-cf-country", cfCountry);
  if (cfCity) response.headers.set("x-cf-city", cfCity);
  if (cfRegion) response.headers.set("x-cf-region", cfRegion);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
