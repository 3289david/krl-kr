/**
 * KRL.KR — Edge Middleware
 * Handles fast URL redirects at the Cloudflare edge
 * Runs before any route handler
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
  "_next",
  "favicon.ico",
  "icon.svg",
  "manifest.json",
  "robots.txt",
  "sitemap.xml",
  "og-image.png",
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // Skip link-in-bio paths (@username)
  if (firstSegment.startsWith("@")) {
    return NextResponse.next();
  }

  // This looks like a short link — let the [slug] page handle it
  // The page will do the DB lookup and redirect
  // We add headers to pass Cloudflare metadata
  const response = NextResponse.next();

  // Forward Cloudflare geo headers if available
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
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
