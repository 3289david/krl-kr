import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import fs from "fs";
import path from "path";
import archiver from "archiver";

export const runtime = "nodejs";

async function collectFiles(pool: any, folderId: number, userId: string, prefix = ""): Promise<Array<{ storagePath: string; relativePath: string }>> {
  const rows = await pool.query(
    "SELECT * FROM drive_files WHERE parent_id=$1 AND user_id=$2 AND deleted_at IS NULL",
    [folderId, userId]
  );
  const results: Array<{ storagePath: string; relativePath: string }> = [];
  for (const row of rows.rows) {
    if (row.type === "file" && row.storage_path) {
      results.push({ storagePath: row.storage_path, relativePath: path.join(prefix, row.name) });
    } else if (row.type === "folder") {
      const sub = await collectFiles(pool, row.id, userId, path.join(prefix, row.name));
      results.push(...sub);
    }
  }
  return results;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const r = await pool.query("SELECT * FROM drive_files WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL", [id, user.id]);
    const file = r.rows[0];
    if (!file) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

    await pool.query("UPDATE drive_files SET download_count=download_count+1 WHERE id=$1", [id]);

    if (file.type === "folder") {
      const files = await collectFiles(pool, file.id, user.id, "");
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        const archive = archiver("zip", { zlib: { level: 6 } });
        archive.on("data", (chunk: Buffer) => chunks.push(chunk));
        archive.on("end", resolve);
        archive.on("error", reject);
        for (const { storagePath, relativePath } of files) {
          if (fs.existsSync(storagePath)) archive.file(storagePath, { name: relativePath });
        }
        archive.finalize();
      });
      const zip = Buffer.concat(chunks);
      const safeName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, "_");
      return new NextResponse(zip, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${safeName}.zip"`,
          "Content-Length": String(zip.length),
        },
      });
    }

    if (!file.storage_path || !fs.existsSync(file.storage_path)) {
      return NextResponse.json({ error: "파일이 존재하지 않습니다." }, { status: 404 });
    }
    const { searchParams } = new URL(request.url);
    const preview = searchParams.get("preview") === "1";
    const buffer = fs.readFileSync(file.storage_path);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": file.mime_type ?? "application/octet-stream",
        "Content-Disposition": preview ? "inline" : `attachment; filename="${encodeURIComponent(file.name)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    console.error("[drive download]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
