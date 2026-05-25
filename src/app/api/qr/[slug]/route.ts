/**
 * KRL.KR — QR Code Generation API
 * GET /api/qr/[slug] — generate QR code for a link
 * Query params:
 *   ?format=svg|png (default: svg)
 *   ?size=200-1000 (default: 400)
 *   ?fg=#000000 (foreground color)
 *   ?bg=#ffffff (background color)
 *   ?margin=0-10 (default: 2)
 */
import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const url = new URL(request.url);

  const format = url.searchParams.get("format") ?? "svg";
  const size = Math.min(1000, Math.max(100, parseInt(url.searchParams.get("size") ?? "400")));
  const fg = url.searchParams.get("fg") ?? "#141413";
  const bg = url.searchParams.get("bg") ?? "#ffffff";
  const margin = Math.min(10, Math.max(0, parseInt(url.searchParams.get("margin") ?? "2")));

  // Validate colors
  const colorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
  const safeFg = colorRegex.test(fg) ? fg : "#141413";
  const safeBg = colorRegex.test(bg) ? bg : "#ffffff";

  const targetUrl = `https://krl.kr/${slug}`;

  try {
    if (format === "png") {
      const { generateQrPng } = await import("@/lib/qr");
      const buffer = await generateQrPng({
        url: targetUrl,
        size,
        style: { foreground: safeFg, background: safeBg, margin },
      });

      return new NextResponse(buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `inline; filename="qr-${slug}.png"`,
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    } else {
      const { generateQrSvg } = await import("@/lib/qr");
      const svgContent = await generateQrSvg({
        url: targetUrl,
        size,
        style: { foreground: safeFg, background: safeBg, margin },
      });

      return new NextResponse(svgContent, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": `inline; filename="qr-${slug}.svg"`,
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    }
  } catch (err) {
    console.error("[/api/qr] Error:", err);

    // Return a placeholder SVG on error
    const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${safeBg}"/>
      <text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="middle"
            font-family="monospace" font-size="14" fill="${safeFg}">QR 생성 오류</text>
    </svg>`;

    return new NextResponse(placeholder, {
      status: 200,
      headers: { "Content-Type": "image/svg+xml" },
    });
  }
}
