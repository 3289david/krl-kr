import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

export const runtime = "nodejs";

const execAsync = promisify(exec);
const HOSTING_DIR = "/var/www/krl-kr/hosting";

const PLAN_STORAGE: Record<string, number> = {
  free: 500 * 1024 * 1024,
  pro: 3 * 1024 * 1024 * 1024,
  vip: 10 * 1024 * 1024 * 1024,
};

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    html: "text/html", htm: "text/html",
    css: "text/css", js: "application/javascript", mjs: "application/javascript",
    json: "application/json", xml: "application/xml",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    ico: "image/x-icon", avif: "image/avif",
    woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf",
    pdf: "application/pdf", txt: "text/plain", md: "text/markdown",
    mp4: "video/mp4", webm: "video/webm",
    mp3: "audio/mpeg", ogg: "audio/ogg",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}

function getDirSize(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) total += getDirSize(full);
    else total += fs.statSync(full).size;
  }
  return total;
}

// POST: upload single file
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const site = await pool.query(
      "SELECT * FROM hosting_sites WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    if (!site.rows[0]) {
      return NextResponse.json({ error: "사이트를 찾을 수 없습니다." }, { status: 404 });
    }

    const planRow = await pool.query("SELECT plan FROM user_plans WHERE user_id = $1", [user.id]);
    const plan = planRow.rows[0]?.plan ?? "free";
    const maxStorage = PLAN_STORAGE[plan] ?? PLAN_STORAGE.free;

    const contentType = request.headers.get("content-type") ?? "";

    // ZIP upload (full deploy)
    if (contentType.includes("application/zip") || contentType.includes("application/x-zip")) {
      const buffer = Buffer.from(await request.arrayBuffer());
      const siteDir = path.join(HOSTING_DIR, id);
      const tmpZip = path.join("/tmp", `hosting_${id}_${Date.now()}.zip`);

      fs.writeFileSync(tmpZip, buffer);

      // Clear existing files
      fs.rmSync(siteDir, { recursive: true, force: true });
      fs.mkdirSync(siteDir, { recursive: true });

      // Extract
      try {
        await execAsync(`unzip -q "${tmpZip}" -d "${siteDir}"`);
      } finally {
        fs.unlinkSync(tmpZip);
      }

      // If unzip created a subdirectory (common pattern), move contents up
      const entries = fs.readdirSync(siteDir);
      if (entries.length === 1) {
        const subPath = path.join(siteDir, entries[0]);
        if (fs.statSync(subPath).isDirectory()) {
          const tmpMove = siteDir + "_tmp_mv";
          fs.renameSync(subPath, tmpMove);
          fs.rmSync(siteDir, { recursive: true });
          fs.renameSync(tmpMove, siteDir);
        }
      }

      const newSize = getDirSize(siteDir);
      if (newSize > maxStorage) {
        fs.rmSync(siteDir, { recursive: true, force: true });
        fs.mkdirSync(siteDir, { recursive: true });
        return NextResponse.json({ error: "저장 공간이 부족합니다." }, { status: 413 });
      }

      await pool.query(
        "UPDATE hosting_sites SET storage_used = $1, updated_at = $2 WHERE id = $3",
        [newSize, Date.now(), id]
      );

      return NextResponse.json({ success: true, storage_used: newSize });
    }

    // Multipart single file upload
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const filePath = formData.get("path")?.toString() ?? file?.name ?? "index.html";

      if (!file) return NextResponse.json({ error: "파일을 선택해주세요." }, { status: 400 });

      // Security: prevent path traversal
      const siteDir = path.join(HOSTING_DIR, id);
      const targetPath = path.resolve(siteDir, filePath.replace(/^\//, ""));
      if (!targetPath.startsWith(siteDir)) {
        return NextResponse.json({ error: "잘못된 파일 경로입니다." }, { status: 400 });
      }

      // Check storage
      const currentSize = getDirSize(siteDir);
      if (currentSize + file.size > maxStorage) {
        return NextResponse.json({ error: "저장 공간이 부족합니다." }, { status: 413 });
      }

      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(targetPath, buffer);

      const newSize = getDirSize(siteDir);
      await pool.query(
        "UPDATE hosting_sites SET storage_used = $1, updated_at = $2 WHERE id = $3",
        [newSize, Date.now(), id]
      );

      return NextResponse.json({ success: true, path: filePath, storage_used: newSize });
    }

    return NextResponse.json({ error: "지원하지 않는 요청 형식입니다." }, { status: 400 });
  } catch (err) {
    console.error("[hosting deploy POST]", err);
    return NextResponse.json({ error: "배포 오류가 발생했습니다." }, { status: 500 });
  }
}

// DELETE: remove a specific file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const site = await pool.query(
      "SELECT * FROM hosting_sites WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    if (!site.rows[0]) return NextResponse.json({ error: "사이트를 찾을 수 없습니다." }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");
    if (!filePath) return NextResponse.json({ error: "path 파라미터가 필요합니다." }, { status: 400 });

    const siteDir = path.join(HOSTING_DIR, id);
    const targetPath = path.resolve(siteDir, filePath.replace(/^\//, ""));
    if (!targetPath.startsWith(siteDir)) {
      return NextResponse.json({ error: "잘못된 파일 경로입니다." }, { status: 400 });
    }

    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);

    const newSize = getDirSize(siteDir);
    await pool.query("UPDATE hosting_sites SET storage_used = $1 WHERE id = $2", [newSize, id]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[hosting deploy DELETE]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
