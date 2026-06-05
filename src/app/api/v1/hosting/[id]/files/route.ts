import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

const HOSTING_DIR = "/var/www/krl-kr/hosting";

function listFilesRecursive(dir: string, base = ""): Array<{ path: string; size: number; modified: number }> {
  const results: Array<{ path: string; size: number; modified: number }> = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(fullPath, relPath));
    } else {
      const stat = fs.statSync(fullPath);
      results.push({ path: relPath, size: stat.size, modified: stat.mtimeMs });
    }
  }
  return results;
}

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

    const site = await pool.query(
      "SELECT * FROM hosting_sites WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    if (!site.rows[0]) return NextResponse.json({ error: "사이트를 찾을 수 없습니다." }, { status: 404 });

    const siteDir = path.join(HOSTING_DIR, id);
    const files = listFilesRecursive(siteDir);

    return NextResponse.json({ files });
  } catch (err) {
    console.error("[hosting files GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
