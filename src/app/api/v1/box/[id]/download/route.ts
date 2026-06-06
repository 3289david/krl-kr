import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { getFile } from "@/lib/storage";

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

    const buffer = await getFile(item.file_key);
    if (!buffer) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

    const filename = encodeURIComponent(item.original_name);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": item.mime_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    console.error("[box/download GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
