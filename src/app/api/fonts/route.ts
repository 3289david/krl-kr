import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Proxy Google Fonts CSS and rewrite URLs to our font file proxy
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Support both ?family= and pass-through of all params
  const family = searchParams.get("family");
  if (!family) {
    return NextResponse.json({ error: "family parameter required" }, { status: 400 });
  }

  const display = searchParams.get("display") ?? "swap";
  const googleUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&display=${display}`;

  try {
    const res = await fetch(googleUrl, {
      headers: {
        // Use a modern user-agent to get woff2 format
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch font" }, { status: 502 });
    }

    let css = await res.text();

    // Rewrite all Google Fonts URLs to go through our proxy
    const origin = new URL(request.url).origin;
    css = css.replace(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g, (_, fontUrl) => {
      return `url(${origin}/api/fonts/file?url=${encodeURIComponent(fontUrl)})`;
    });

    return new NextResponse(css, {
      headers: {
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to proxy font" }, { status: 502 });
  }
}
