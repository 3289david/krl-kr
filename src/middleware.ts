/**
 * KRL.KR — Edge Middleware
 * 1. *.krl.kr wildcard subdomains → internal sub-redirect API
 * 2. Short link slugs → [slug] page
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
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") ?? "";

  // ── 1. Wildcard subdomain routing (*.krl.kr) ────────────────────────────────
  // e.g. david.krl.kr → rewrite to internal sub-redirect route
  const isWildcardSub =
    hostname.endsWith(".krl.kr") &&
    hostname !== "krl.kr" &&
    hostname !== "www.krl.kr";

  if (isWildcardSub) {
    // Already going to the internal sub route → skip to prevent infinite loop
    if (pathname.startsWith("/api/v1/internal/sub")) {
      return NextResponse.next();
    }

    const subName = hostname.split(".")[0];
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/api/v1/internal/sub";
    rewriteUrl.searchParams.set("name", subName);
    return NextResponse.rewrite(rewriteUrl);
  }

  // ── 2. Short link slugs ──────────────────────────────────────────────────────

  // Skip API routes, static files, and Next.js internals
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/")
  ) {
    return NextResponse.next();
  }

  // Extract slug from path
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return NextResponse.next();

  const firstSegment = segments[0];

  // Skip reserved paths
  if (RESERVED_PATHS.has(firstSegment)) {
    return NextResponse.next();
  }

  // Rewrite @username -> /bio/username (link-in-bio public pages)
  if (firstSegment.startsWith("@")) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/bio/${firstSegment.slice(1)}${segments.length > 1 ? "/" + segments.slice(1).join("/") : ""}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  // This looks like a short link — let the [slug] page handle it
  // Forward Cloudflare geo headers if available
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
