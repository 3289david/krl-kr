import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import fs from "fs";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const result = await pool.query(
      "SELECT * FROM drive_files WHERE id = $1 AND user_id = $2 AND type = 'file'",
      [id, user.id]
    );
    const file = result.rows[0];
    if (!file) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
    if (!file.storage_path || !fs.existsSync(file.storage_path)) {
      return NextResponse.json({ error: "파일이 존재하지 않습니다." }, { status: 404 });
    }

    const buffer = fs.readFileSync(file.storage_path);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": file.mime_type ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    console.error("[drive download]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
