/**
 * KRL.KR — QR Code Generation
 * SVG-based QR codes with custom styling
 */

export interface QrStyle {
  foreground?: string;
  background?: string;
  cornerRadius?: number;  // 0-50 percentage
  dotStyle?: "square" | "rounded" | "dots" | "classy";
  cornerStyle?: "square" | "rounded" | "extra-rounded";
  logoSize?: number;       // 0-30 percentage
  margin?: number;
}

export const DEFAULT_QR_STYLE: QrStyle = {
  foreground: "#141413",
  background: "#FFFFFF",
  cornerRadius: 0,
  dotStyle: "square",
  cornerStyle: "square",
  logoSize: 0,
  margin: 4,
};

// ─── QR Matrix generation (Reed-Solomon) ─────────────────────────────────────
// Using a simplified QR code library approach
// For production, use the `qrcode` package on Node.js, or
// a WASM-based solution on edge

export interface QrCodeOptions {
  url: string;
  style?: QrStyle;
  logoUrl?: string;
  size?: number;
}

export async function generateQrSvg(options: QrCodeOptions): Promise<string> {
  const { url, style = DEFAULT_QR_STYLE, size = 300 } = options;
  const mergedStyle = { ...DEFAULT_QR_STYLE, ...style };

  // Dynamic import for edge compatibility
  // In production with Node.js runtime:
  const { default: QRCode } = await import("qrcode");

  const dataUrl = await QRCode.toDataURL(url, {
    width: size,
    margin: mergedStyle.margin ?? 4,
    color: {
      dark: mergedStyle.foreground ?? "#141413",
      light: mergedStyle.background ?? "#FFFFFF",
    },
    errorCorrectionLevel: "H", // High error correction for logo overlay
  });

  // Convert to SVG for scalability
  const svgContent = await QRCode.toString(url, {
    type: "svg",
    width: size,
    margin: mergedStyle.margin ?? 4,
    color: {
      dark: mergedStyle.foreground ?? "#141413",
      light: mergedStyle.background ?? "#FFFFFF",
    },
    errorCorrectionLevel: "H",
  });

  void dataUrl; // Used as fallback
  return svgContent;
}

export async function generateQrPng(options: QrCodeOptions): Promise<Buffer> {
  const { url, style = DEFAULT_QR_STYLE, size = 400 } = options;
  const mergedStyle = { ...DEFAULT_QR_STYLE, ...style };

  const { default: QRCode } = await import("qrcode");

  const buffer = await QRCode.toBuffer(url, {
    width: size,
    margin: mergedStyle.margin ?? 4,
    color: {
      dark: mergedStyle.foreground ?? "#141413",
      light: mergedStyle.background ?? "#FFFFFF",
    },
    errorCorrectionLevel: "H",
  });

  return buffer;
}

// ─── Style presets ────────────────────────────────────────────────────────────
export const QR_PRESETS: Record<string, { label: string; style: QrStyle }> = {
  classic: {
    label: "클래식",
    style: {
      foreground: "#141413",
      background: "#FFFFFF",
      dotStyle: "square",
      cornerStyle: "square",
    },
  },
  dark: {
    label: "다크",
    style: {
      foreground: "#F3F0EE",
      background: "#141413",
      dotStyle: "square",
      cornerStyle: "square",
    },
  },
  rounded: {
    label: "라운드",
    style: {
      foreground: "#141413",
      background: "#FFFFFF",
      dotStyle: "rounded",
      cornerStyle: "rounded",
      cornerRadius: 20,
    },
  },
  dots: {
    label: "점형",
    style: {
      foreground: "#141413",
      background: "#FFFFFF",
      dotStyle: "dots",
      cornerStyle: "extra-rounded",
    },
  },
  brand: {
    label: "브랜드",
    style: {
      foreground: "#141413",
      background: "#F3F0EE",
      dotStyle: "classy",
      cornerStyle: "square",
    },
  },
};

// ─── SVG inline preview (for immediate rendering) ─────────────────────────────
export function generatePlaceholderSvg(size = 200): string {
  const cellSize = size / 25;
  // Simple pattern for preview
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="white"/>
    <rect x="${cellSize}" y="${cellSize}" width="${cellSize * 7}" height="${cellSize * 7}" fill="black"/>
    <rect x="${cellSize * 2}" y="${cellSize * 2}" width="${cellSize * 5}" height="${cellSize * 5}" fill="white"/>
    <rect x="${cellSize * 3}" y="${cellSize * 3}" width="${cellSize * 3}" height="${cellSize * 3}" fill="black"/>
    <rect x="${cellSize * 17}" y="${cellSize}" width="${cellSize * 7}" height="${cellSize * 7}" fill="black"/>
    <rect x="${cellSize * 18}" y="${cellSize * 2}" width="${cellSize * 5}" height="${cellSize * 5}" fill="white"/>
    <rect x="${cellSize * 19}" y="${cellSize * 3}" width="${cellSize * 3}" height="${cellSize * 3}" fill="black"/>
    <rect x="${cellSize}" y="${cellSize * 17}" width="${cellSize * 7}" height="${cellSize * 7}" fill="black"/>
    <rect x="${cellSize * 2}" y="${cellSize * 18}" width="${cellSize * 5}" height="${cellSize * 5}" fill="white"/>
    <rect x="${cellSize * 3}" y="${cellSize * 19}" width="${cellSize * 3}" height="${cellSize * 3}" fill="black"/>
    <text x="${size / 2}" y="${size / 2 + 5}" text-anchor="middle" font-size="${cellSize * 1.5}" fill="#141413" font-family="monospace">KRL.KR</text>
  </svg>`;
}
