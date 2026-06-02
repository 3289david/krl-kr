import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { getDB } from "@/lib/env";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "지원하지 않는 파일 형식입니다." }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "파일 크기는 10MB 이하여야 합니다." }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const dir = join(process.cwd(), "uploads", "blog");
  await mkdir(dir, { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(join(dir, name), Buffer.from(bytes));

  return NextResponse.json({ url: `/uploads/blog/${name}` });
}
