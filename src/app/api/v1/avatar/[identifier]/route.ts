import { NextRequest, NextResponse } from "next/server";

const PALETTE = [
  ["#6366f1","#4f46e5"],["#8b5cf6","#7c3aed"],["#ec4899","#db2777"],
  ["#ef4444","#dc2626"],["#f97316","#ea580c"],["#eab308","#ca8a04"],
  ["#22c55e","#16a34a"],["#14b8a6","#0d9488"],["#3b82f6","#2563eb"],
  ["#06b6d4","#0891b2"],["#64748b","#475569"],["#78716c","#57534e"],
];

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return Math.abs(h);
}

function getInitials(id: string): string {
  const clean = id.replace(/[^a-zA-Z0-9가-힣]/g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) {
    const w = parts[0];
    if (w.length >= 2 && /[가-힣]/.test(w)) return w[0];
    return w.length >= 2 ? (w[0] + w[1]).toUpperCase() : w[0].toUpperCase();
  }
  return "?";
}

function makePixelSvg(id: string, size: number, [bg, accent]: string[]): string {
  const hash = hashStr(id);
  const cells = 5;
  const cellSize = size / cells;
  let rects = "";
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < Math.ceil(cells / 2); col++) {
      const on = (hash >> (row * 3 + col)) & 1;
      if (on) {
        const x = col * cellSize;
        const mirrorX = (cells - 1 - col) * cellSize;
        rects += `<rect x="${x}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="${accent}"/>`;
        if (col !== cells - 1 - col)
          rects += `<rect x="${mirrorX}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="${accent}"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  ${rects}
</svg>`;
}

function makeGradientSvg(id: string, size: number, [bg, accent]: string[], initials: string): string {
  const r = size / 2;
  const fontSize = size * 0.38;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <circle cx="${r}" cy="${r}" r="${r}" fill="url(#g)"/>
  <text x="${r}" y="${r}" text-anchor="middle" dominant-baseline="central"
    font-family="system-ui,sans-serif" font-size="${fontSize}" font-weight="700" fill="white">${initials}</text>
</svg>`;
}

function makeInitialsSvg(id: string, size: number, colors: string[], initials: string): string {
  const [bg] = colors;
  const r = size / 2;
  const fontSize = size * 0.38;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${r}" cy="${r}" r="${r}" fill="${bg}"/>
  <text x="${r}" y="${r}" text-anchor="middle" dominant-baseline="central"
    font-family="system-ui,sans-serif" font-size="${fontSize}" font-weight="700" fill="white">${initials}</text>
</svg>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const { identifier } = await params;
  const sp = request.nextUrl.searchParams;
  const size = Math.min(512, Math.max(16, parseInt(sp.get("size") ?? "80")));
  const style = sp.get("style") ?? "initials"; // initials | gradient | pixel
  const id = decodeURIComponent(identifier).replace(/\.[^.]+$/, ""); // strip extension

  const colors = PALETTE[hashStr(id) % PALETTE.length];
  const initials = getInitials(id);

  let svg: string;
  if (style === "pixel") {
    svg = makePixelSvg(id, size, colors);
  } else if (style === "gradient") {
    svg = makeGradientSvg(id, size, colors, initials);
  } else {
    svg = makeInitialsSvg(id, size, colors, initials);
  }

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
