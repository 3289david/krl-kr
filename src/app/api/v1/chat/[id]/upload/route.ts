import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const UPLOAD_DIR = "/var/www/krl-kr/uploads/chat";
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const member = await pool.query(
      "SELECT 1 FROM chat_members WHERE room_id=$1 AND user_id=$2",
      [id, user.id]
    );
    if (!member.rows[0]) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "파일이 너무 큽니다 (최대 100MB)" }, { status: 413 });

    const ext = path.extname(file.name).toLowerCase() || "";
    const uuid = randomUUID();
    const userDir = path.join(UPLOAD_DIR, user.id);
    fs.mkdirSync(userDir, { recursive: true });
    const filename = `${uuid}${ext}`;
    const filePath = path.join(userDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/chat/${user.id}/${filename}`;

    return NextResponse.json({
      attachment: {
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        url,
      }
    });
  } catch (err) {
    console.error("[chat upload]", err);
    return NextResponse.json({ error: "업로드 실패" }, { status: 500 });
  }
}
