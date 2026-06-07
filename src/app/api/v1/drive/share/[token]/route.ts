import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import archiver from "archiver";

export const runtime = "nodejs";

async function checkToken(pool: any, token: string) {
  const r = await pool.query("SELECT * FROM drive_files WHERE share_token=$1 AND is_shared=TRUE", [token]);
  const file = r.rows[0];
  if (!file) return { file: null, error: "공유 링크를 찾을 수 없습니다." };
  if (file.share_expires_at && Number(file.share_expires_at) < Date.now())
    return { file: null, error: "공유 링크가 만료되었습니다." };
  return { file, error: null };
}

async function collectFiles(pool: any, folderId: number, userId: string, prefix = ""): Promise<Array<{ storagePath: string; relativePath: string; name: string; size: number; mime_type: string }>> {
  const rows = await pool.query(
    "SELECT * FROM drive_files WHERE parent_id=$1 AND user_id=$2 AND deleted_at IS NULL ORDER BY type DESC, name ASC",
    [folderId, userId]
  );
  const results: any[] = [];
  for (const row of rows.rows) {
    if (row.type === "file" && row.storage_path) {
      results.push({ storagePath: row.storage_path, relativePath: path.join(prefix, row.name), name: row.name, size: Number(row.size), mime_type: row.mime_type });
    } else if (row.type === "folder") {
      const sub = await collectFiles(pool, row.id, userId, path.join(prefix, row.name));
      results.push(...sub);
    }
  }
  return results;
}

// GET — meta, folder listing, file download, folder zip
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  const { file, error: tokenErr } = await checkToken(pool, token);
  if (!file) return NextResponse.json({ error: tokenErr }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const metaOnly = searchParams.get("meta") === "1";
  const preview = searchParams.get("preview") === "1";
  const action = searchParams.get("action"); // "download"
  const password = searchParams.get("password");
  const subFolder = searchParams.get("folder"); // child folder id inside shared folder

  // Password check
  if (file.share_password) {
    if (!password || password !== file.share_password) {
      return NextResponse.json({ error: "비밀번호가 필요합니다.", password_required: true }, { status: 403 });
    }
  }

  // Track download
  if (action === "download" || (!metaOnly && file.type === "file")) {
    await pool.query("UPDATE drive_files SET download_count=download_count+1 WHERE id=$1", [file.id]);
  }

  // Folder listing
  if (file.type === "folder" && !action) {
    const browseFolderId = subFolder ? Number(subFolder) : file.id;
    // Verify subFolder is inside the shared folder tree
    const listing = await pool.query(
      "SELECT id, name, type, size, mime_type, download_count, created_at, updated_at FROM drive_files WHERE parent_id=$1 AND user_id=$2 AND deleted_at IS NULL ORDER BY type DESC, name ASC",
      [browseFolderId, file.user_id]
    );
    // Breadcrumb path for subfolder
    let breadcrumb: Array<{ id: number; name: string }> = [];
    if (subFolder) {
      let cur = Number(subFolder);
      while (cur && cur !== file.id) {
        const pr = await pool.query("SELECT id, name, parent_id FROM drive_files WHERE id=$1", [cur]);
        if (!pr.rows[0]) break;
        breadcrumb.unshift({ id: pr.rows[0].id, name: pr.rows[0].name });
        cur = pr.rows[0].parent_id;
      }
    }
    return NextResponse.json({
      type: "folder",
      id: file.id,
      name: file.name,
      token,
      files: listing.rows,
      breadcrumb,
      password_protected: !!file.share_password,
    });
  }

  // Folder ZIP download
  if (file.type === "folder" && action === "download") {
    const subfolderId = subFolder ? Number(subFolder) : file.id;
    const files = await collectFiles(pool, subfolderId, file.user_id, "");
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      const archive = archiver("zip", { zlib: { level: 6 } });
      archive.on("data", (chunk: Buffer) => chunks.push(chunk));
      archive.on("end", resolve);
      archive.on("error", reject);
      for (const f of files) {
        if (fs.existsSync(f.storagePath)) archive.file(f.storagePath, { name: f.relativePath });
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

  // File meta
  if (metaOnly) {
    return NextResponse.json({
      type: "file",
      name: file.name,
      size: file.size,
      mime_type: file.mime_type,
      created_at: file.created_at,
      download_count: file.download_count,
      password_protected: !!file.share_password,
    });
  }

  // File download/preview
  if (!file.storage_path || !fs.existsSync(file.storage_path)) {
    return NextResponse.json({ error: "파일이 존재하지 않습니다." }, { status: 404 });
  }
  const buffer = fs.readFileSync(file.storage_path);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": file.mime_type ?? "application/octet-stream",
      "Content-Disposition": preview ? "inline" : `attachment; filename="${encodeURIComponent(file.name)}"`,
      "Content-Length": String(buffer.length),
    },
  });
}

export async function HEAD(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  const r = await pool.query("SELECT name, mime_type, size FROM drive_files WHERE share_token=$1 AND is_shared=TRUE", [token]);
  if (!r.rows[0]) return new NextResponse(null, { status: 404 });
  const f = r.rows[0];
  return new NextResponse(null, { headers: { "Content-Type": f.mime_type ?? "application/octet-stream", "Content-Length": String(f.size), "X-File-Name": encodeURIComponent(f.name) } });
}
