import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

function checkTools(): { sharp: boolean; ffmpeg: boolean; convert: boolean } {
  const result = { sharp: false, ffmpeg: false, convert: false };
  try {
    require.resolve("sharp");
    result.sharp = true;
  } catch {}
  try {
    const { execSync } = require("child_process");
    execSync("which ffmpeg", { stdio: "ignore" });
    result.ffmpeg = true;
  } catch {}
  try {
    const { execSync } = require("child_process");
    execSync("which convert", { stdio: "ignore" });
    result.convert = true;
  } catch {}
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const tools = checkTools();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const target_format = formData.get("target_format") as string | null;

    if (!file || !target_format) {
      return NextResponse.json({ error: "파일과 대상 형식이 필요합니다." }, { status: 400 });
    }

    const supportedConversions: Record<string, string[]> = {
      "image/jpeg": ["png", "webp"],
      "image/png": ["jpg", "jpeg", "webp"],
      "image/webp": ["jpg", "jpeg", "png"],
    };

    if (!supportedConversions[file.type]?.includes(target_format.toLowerCase())) {
      return NextResponse.json({
        error: `${file.type}에서 ${target_format}으로의 변환을 지원하지 않습니다.`,
        supported: false,
      }, { status: 400 });
    }

    if (!tools.sharp) {
      return NextResponse.json({
        error: "변환 서비스를 설정 중입니다.",
        supported: false,
        message: "서버에 변환 모듈이 없습니다",
      }, { status: 503 });
    }

    // Sharp-based conversion
    const sharp = require("sharp");
    const buffer = Buffer.from(await file.arrayBuffer());
    let outputBuffer: Buffer;
    const fmt = target_format.toLowerCase().replace("jpg", "jpeg");

    if (fmt === "jpeg") {
      outputBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
    } else if (fmt === "png") {
      outputBuffer = await sharp(buffer).png().toBuffer();
    } else if (fmt === "webp") {
      outputBuffer = await sharp(buffer).webp({ quality: 90 }).toBuffer();
    } else {
      return NextResponse.json({ error: "지원하지 않는 형식입니다.", supported: false }, { status: 400 });
    }

    const mimeMap: Record<string, string> = {
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };

    const originalName = file.name.replace(/\.[^.]+$/, "");
    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeMap[fmt] ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${originalName}.${target_format}"`,
        "Content-Length": String(outputBuffer.length),
      },
    });
  } catch (err) {
    console.error("[convert POST]", err);
    return NextResponse.json({ error: "변환 중 오류가 발생했습니다." }, { status: 500 });
  }
}
