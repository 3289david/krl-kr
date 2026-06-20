import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { saveFile, getFilePath } from "@/lib/storage";
import { checkStorageQuota } from "@/lib/storage-quota";
import { isVideo, queueHls } from "@/lib/hls";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const quota = await checkStorageQuota(pool, user.id, file.size);
    if (!quota.ok) {
      return NextResponse.json({ error: "저장 공간이 부족합니다.", storage: quota }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { key } = await saveFile(buffer, file.name, file.type);
    const now = Date.now();
    const result = await pool.query(
      "INSERT INTO box_items (user_id, file_key, original_name, file_size, mime_type, notes, archived_at) VALUES ($1, $2, $3, $4, $5, '', $6) RETURNING *",
      [user.id, key, file.name, file.size, file.type || "application/octet-stream", now]
    );
    const item = result.rows[0];

    // Queue HLS for video files immediately after upload
    if (isVideo(file.type)) {
      queueHls(getFilePath(key), `box_${item.id}`);
    }

    return NextResponse.json({ item, storage: quota }, { status: 201 });
  } catch (err) {
    console.error("[box/upload POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
