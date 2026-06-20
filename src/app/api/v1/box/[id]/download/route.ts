import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { getFilePath } from "@/lib/storage";
import { streamFile } from "@/lib/stream-file";
import { isVideo, queueHls } from "@/lib/hls";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const result = await pool.query("SELECT * FROM box_items WHERE id = $1 AND user_id = $2", [id, user.id]);
    const item = result.rows[0];
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const filePath = getFilePath(item.file_key);
    const mimeType = item.mime_type || "application/octet-stream";

    if (isVideo(mimeType)) {
      queueHls(filePath, `box_${id}`);
    }

    const filename = encodeURIComponent(item.original_name);
    return streamFile(
      filePath,
      mimeType,
      request.headers.get("range"),
      `attachment; filename*=UTF-8''${filename}`
    );
  } catch (err) {
    console.error("[box/download GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
