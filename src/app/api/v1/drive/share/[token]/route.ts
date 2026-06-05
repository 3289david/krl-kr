import { NextRequest, NextResponse } from "next/server";
import fs from "fs";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const result = await pool.query(
      "SELECT * FROM drive_files WHERE share_token = $1 AND is_shared = TRUE AND type = 'file'",
      [token]
    );
    const file = result.rows[0];
    if (!file) return NextResponse.json({ error: "공유 파일을 찾을 수 없습니다." }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const preview = searchParams.get("preview") === "1";

    if (!file.storage_path || !fs.existsSync(file.storage_path)) {
      return NextResponse.json({ error: "파일이 존재하지 않습니다." }, { status: 404 });
    }

    const buffer = fs.readFileSync(file.storage_path);
    const disposition = preview ? "inline" : `attachment; filename="${encodeURIComponent(file.name)}"`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": file.mime_type ?? "application/octet-stream",
        "Content-Disposition": disposition,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    console.error("[drive share token GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// Return file metadata without downloading
export async function HEAD(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const result = await pool.query(
      "SELECT name, mime_type, size FROM drive_files WHERE share_token = $1 AND is_shared = TRUE",
      [token]
    );
    if (!result.rows[0]) return new NextResponse(null, { status: 404 });

    const file = result.rows[0];
    return new NextResponse(null, {
      headers: {
        "Content-Type": file.mime_type ?? "application/octet-stream",
        "Content-Length": String(file.size),
        "X-File-Name": encodeURIComponent(file.name),
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
