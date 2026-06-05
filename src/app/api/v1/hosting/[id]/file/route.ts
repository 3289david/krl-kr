import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

const HOSTING_DIR = "/var/www/krl-kr/hosting";

const EDITABLE_EXTS = new Set([
  "html", "htm", "css", "js", "ts", "jsx", "tsx", "json", "xml",
  "txt", "md", "svg", "yaml", "yml", "toml", "env", "sh",
  "php", "py", "rb", "go", "java", "rs",
]);

export async function GET(
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

    const site = await pool.query("SELECT id FROM hosting_sites WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!site.rows[0]) return NextResponse.json({ error: "사이트를 찾을 수 없습니다." }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");
    if (!filePath) return NextResponse.json({ error: "path 파라미터가 필요합니다." }, { status: 400 });

    const siteDir = path.join(HOSTING_DIR, id);
    const targetPath = path.resolve(siteDir, filePath.replace(/^\//, ""));
    if (!targetPath.startsWith(siteDir)) return NextResponse.json({ error: "잘못된 경로" }, { status: 400 });

    const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
    if (!EDITABLE_EXTS.has(ext)) {
      return NextResponse.json({ error: "편집할 수 없는 파일 형식입니다." }, { status: 400 });
    }

    if (!fs.existsSync(targetPath)) return NextResponse.json({ error: "파일이 없습니다." }, { status: 404 });

    const content = fs.readFileSync(targetPath, "utf-8");
    return NextResponse.json({ content, path: filePath });
  } catch (err) {
    console.error("[hosting file GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PUT(
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

    const site = await pool.query("SELECT id FROM hosting_sites WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!site.rows[0]) return NextResponse.json({ error: "사이트를 찾을 수 없습니다." }, { status: 404 });

    const body = await request.json();
    const { path: filePath, content } = body;

    if (!filePath || content === undefined) {
      return NextResponse.json({ error: "path와 content가 필요합니다." }, { status: 400 });
    }

    const siteDir = path.join(HOSTING_DIR, id);
    const targetPath = path.resolve(siteDir, (filePath as string).replace(/^\//, ""));
    if (!targetPath.startsWith(siteDir)) return NextResponse.json({ error: "잘못된 경로" }, { status: 400 });

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content as string, "utf-8");

    // Update storage used
    function getDirSize(dir: string): number {
      if (!fs.existsSync(dir)) return 0;
      let t = 0;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) t += getDirSize(p);
        else t += fs.statSync(p).size;
      }
      return t;
    }
    const newSize = getDirSize(siteDir);
    await pool.query("UPDATE hosting_sites SET storage_used = $1, updated_at = $2 WHERE id = $3", [newSize, Date.now(), id]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[hosting file PUT]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
