import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/auth";

// GET /api/snapshot?url=https://example.com
// Returns screenshot via external API (configure SCREENSHOT_API_KEY in .env)
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url") ?? "";
  const width = Math.min(1920, Math.max(320, parseInt(request.nextUrl.searchParams.get("width") ?? "1280")));
  const height = Math.min(1080, Math.max(200, parseInt(request.nextUrl.searchParams.get("height") ?? "720")));

  if (!url) return NextResponse.json({ error: "url 파라미터가 필요합니다." }, { status: 400 });

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "올바른 URL을 입력해주세요." }, { status: 400 });
  }

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit({ key: `snapshot:${ip}`, limit: 10, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });

  // Option 1: screenshotone.com API (set SCREENSHOTONE_KEY in .env)
  const soKey = process.env.SCREENSHOTONE_KEY;
  if (soKey) {
    const apiUrl = `https://api.screenshotone.com/take?access_key=${soKey}&url=${encodeURIComponent(url)}&viewport_width=${width}&viewport_height=${height}&format=jpg&image_quality=80&delay=1&cache=true&cache_ttl=86400`;
    const res = await fetch(apiUrl);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  // Option 2: Microlink (free tier)
  const mlUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=true&meta=false`;
  try {
    const res = await fetch(mlUrl, { headers: { "User-Agent": "KRL/1.0" } });
    if (res.ok) {
      const data = await res.json() as { data?: { screenshot?: { url?: string } } };
      const imgUrl = data?.data?.screenshot?.url;
      if (imgUrl) {
        const imgRes = await fetch(imgUrl);
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer();
          const ct = imgRes.headers.get("content-type") ?? "image/jpeg";
          return new NextResponse(buf, {
            headers: { "Content-Type": ct, "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" },
          });
        }
        return NextResponse.json({ screenshot_url: imgUrl }, { headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }
  } catch {
    // fallback below
  }

  // Fallback: SVG placeholder with site URL
  const domain = new URL(url).hostname;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f8fafc"/>
  <rect x="0" y="0" width="${width}" height="40" fill="#e2e8f0"/>
  <circle cx="20" cy="20" r="6" fill="#f87171"/><circle cx="36" cy="20" r="6" fill="#fbbf24"/><circle cx="52" cy="20" r="6" fill="#34d399"/>
  <rect x="68" y="10" width="${width - 100}" height="20" rx="4" fill="#fff"/>
  <text x="${width/2}" y="${height/2}" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif" font-size="18" fill="#94a3b8">${domain}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60", "Access-Control-Allow-Origin": "*" },
  });
}
