import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const COLORS: Record<string, string> = {
  brightgreen: "#4c1",
  green: "#97ca00",
  yellowgreen: "#a4a61d",
  yellow: "#dfb317",
  orange: "#fe7d37",
  red: "#e05d44",
  lightred: "#df5a49",
  blue: "#007ec6",
  lightblue: "#5bc0de",
  lightgrey: "#9f9f9f",
  grey: "#555555",
  blueviolet: "#8a2be2",
  pink: "#e76db2",
  success: "#4c1",
  critical: "#e05d44",
  important: "#fe7d37",
  informational: "#007ec6",
  inactive: "#9f9f9f",
};

function charWidth(char: string): number {
  const narrow = "fijlrt!,./:;| ".split("");
  const wide = "mwMW".split("");
  if (narrow.includes(char)) return 5;
  if (wide.includes(char)) return 9;
  return 7;
}

function textWidth(text: string): number {
  return text.split("").reduce((acc, c) => acc + charWidth(c), 0);
}

function makeBadge(label: string, message: string, color: string, style: string): string {
  const lw = textWidth(label) + 10;
  const mw = textWidth(message) + 10;
  const totalW = lw + mw;
  const h = 20;

  const lx = lw / 2 + 1;
  const mx = lw + mw / 2 - 1;

  const badgeColor = COLORS[color] ?? (color.startsWith("#") ? color : "#" + color) ?? "#007ec6";

  if (style === "flat-square") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${h}">
<g>
  <rect width="${lw}" height="${h}" fill="#555"/>
  <rect x="${lw}" width="${mw}" height="${h}" fill="${badgeColor}"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
  <text x="${lx}" y="14" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
  <text x="${lx}" y="13">${escapeXml(label)}</text>
  <text x="${mx}" y="14" fill="#010101" fill-opacity=".3">${escapeXml(message)}</text>
  <text x="${mx}" y="13">${escapeXml(message)}</text>
</g>
</svg>`;
  }

  if (style === "for-the-badge") {
    const bigH = 28;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${bigH}">
<g>
  <rect width="${lw}" height="${bigH}" fill="#555"/>
  <rect x="${lw}" width="${mw}" height="${bigH}" fill="${badgeColor}"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="10" font-weight="bold" letter-spacing="1">
  <text x="${lx}" y="19" fill="#010101" fill-opacity=".3" transform="translate(0,1)">${escapeXml(label.toUpperCase())}</text>
  <text x="${lx}" y="18">${escapeXml(label.toUpperCase())}</text>
  <text x="${mx}" y="19" fill="#010101" fill-opacity=".3" transform="translate(0,1)">${escapeXml(message.toUpperCase())}</text>
  <text x="${mx}" y="18">${escapeXml(message.toUpperCase())}</text>
</g>
</svg>`;
  }

  // Default: flat style with gradient
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${h}">
<linearGradient id="s" x2="0" y2="100%">
  <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
  <stop offset="1" stop-opacity=".1"/>
</linearGradient>
<clipPath id="r">
  <rect width="${totalW}" height="${h}" rx="3" fill="#fff"/>
</clipPath>
<g clip-path="url(#r)">
  <rect width="${lw}" height="${h}" fill="#555"/>
  <rect x="${lw}" width="${mw}" height="${h}" fill="${badgeColor}"/>
  <rect width="${totalW}" height="${h}" fill="url(#s)"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
  <text x="${lx}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
  <text x="${lx}" y="14">${escapeXml(label)}</text>
  <text x="${mx}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(message)}</text>
  <text x="${mx}" y="14">${escapeXml(message)}</text>
</g>
</svg>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const label = (searchParams.get("label") ?? "label").slice(0, 50);
  const message = (searchParams.get("message") ?? searchParams.get("msg") ?? "value").slice(0, 50);
  const color = (searchParams.get("color") ?? "blue").slice(0, 30);
  const style = searchParams.get("style") ?? "flat";

  const svg = makeBadge(label, message, color, style);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
