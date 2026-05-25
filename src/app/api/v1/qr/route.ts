import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";

const QRSchema = z.object({
  url: z.string().min(1, "URL을 입력해주세요."),
  style: z
    .object({
      size: z.number().int().min(64).max(1024).optional(),
      color: z.string().optional(),
      bgColor: z.string().optional(),
      errorCorrection: z.enum(["L", "M", "Q", "H"]).optional(),
    })
    .optional(),
  logo_url: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = QRSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const { url, style = {} } = parsed.data;
    const size = style.size ?? 300;
    const color = style.color ?? "#141413";
    const bgColor = style.bgColor ?? "#FCFBFA";
    const errorCorrection = style.errorCorrection ?? "M";

    // Generate SVG
    const svg = await QRCode.toString(url, {
      type: "svg",
      width: size,
      margin: 2,
      color: {
        dark: color,
        light: bgColor,
      },
      errorCorrectionLevel: errorCorrection,
    });

    // Generate PNG as base64
    const pngBuffer = await QRCode.toBuffer(url, {
      type: "png",
      width: size,
      margin: 2,
      color: {
        dark: color,
        light: bgColor,
      },
      errorCorrectionLevel: errorCorrection,
    });

    const pngBase64 = pngBuffer.toString("base64");

    return NextResponse.json({
      svg,
      png_base64: `data:image/png;base64,${pngBase64}`,
      url,
      size,
      color,
      bg_color: bgColor,
      error_correction: errorCorrection,
    });
  } catch (err) {
    console.error("[/api/v1/qr] Error:", err);
    return NextResponse.json(
      { error: "QR 코드 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
