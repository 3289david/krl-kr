import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { getPool } from "@/lib/db/postgres";
import { execFile } from "child_process";
import { promisify } from "util";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { github_url } = body;

    if (!github_url || !github_url.startsWith("https://github.com/")) {
      return NextResponse.json({ error: "유효한 GitHub URL을 입력하세요." }, { status: 400 });
    }

    const pool = await getPool();
    const wsRes = await pool.query(
      "SELECT dir_path FROM workspaces WHERE id=$1 AND user_id=$2 AND status='active'",
      [id, user.id]
    );
    if (!wsRes.rows.length) return NextResponse.json({ error: "워크스페이스를 찾을 수 없습니다." }, { status: 404 });

    const dirPath = wsRes.rows[0].dir_path;

    // Check if already has files
    const { readdirSync } = await import("fs");
    const entries = readdirSync(dirPath);
    if (entries.length > 0) {
      return NextResponse.json({ error: "워크스페이스가 비어있지 않습니다. 빈 워크스페이스에만 클론 가능합니다." }, { status: 400 });
    }

    // Clone repo (timeout 120s)
    await execFileAsync("git", ["clone", "--depth=1", github_url, "."], {
      cwd: dirPath,
      timeout: 120000,
    });

    // Update DB
    const now = Date.now();
    await pool.query(
      "UPDATE workspaces SET github_url=$1, updated_at=$2 WHERE id=$3",
      [github_url, now, id]
    );

    return NextResponse.json({ ok: true, message: "클론 완료" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `클론 실패: ${msg}` }, { status: 500 });
  }
}
