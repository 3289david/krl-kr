import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { getPool } from "@/lib/db/postgres";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const WORKSPACE_ROOT = "/var/www/krl-kr/workspaces";

function safeJoin(base: string, rel: string): string | null {
  // base 자체가 WORKSPACE_ROOT 하위인지 확인 (이중 검증)
  if (!path.resolve(base).startsWith(WORKSPACE_ROOT)) return null;
  // null byte, 심볼릭 링크 공격 방지
  if (rel.includes("\0")) return null;
  const resolved = path.resolve(base, rel.replace(/^\/+/, ""));
  // 반드시 base 하위여야 함
  if (!resolved.startsWith(base + path.sep) && resolved !== base) return null;
  return resolved;
}

// 읽기 가능한 최대 파일 크기
const MAX_READ_BYTES = 2 * 1024 * 1024; // 2MB

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const wsRes = await pool.query(
      "SELECT dir_path FROM workspaces WHERE id=$1 AND user_id=$2 AND status='active'",
      [id, user.id]
    );
    if (!wsRes.rows.length) return NextResponse.json({ error: "워크스페이스를 찾을 수 없습니다." }, { status: 404 });

    const base = wsRes.rows[0].dir_path;
    const rel = new URL(request.url).searchParams.get("path") ?? "/";
    const dir = safeJoin(base, rel);
    if (!dir) return NextResponse.json({ error: "잘못된 경로입니다." }, { status: 400 });

    const action = new URL(request.url).searchParams.get("action");

    if (action === "read") {
      if (!fs.existsSync(dir)) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
      const stat = fs.statSync(dir);
      if (stat.isDirectory()) return NextResponse.json({ error: "디렉토리입니다." }, { status: 400 });
      if (stat.size > MAX_READ_BYTES) return NextResponse.json({ error: "파일이 너무 큽니다. (최대 2MB)" }, { status: 413 });
      const content = fs.readFileSync(dir, "utf8");
      return NextResponse.json({ content });
    }

    // List directory
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const entries = fs.readdirSync(dir).map((name) => {
      const fullPath = path.join(dir, name);
      const stat = fs.statSync(fullPath);
      return {
        name,
        path: path.join(rel, name).replace(/\\/g, "/"),
        is_dir: stat.isDirectory(),
        size: stat.size,
        modified: stat.mtimeMs,
      };
    }).sort((a, b) => {
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ entries, path: rel });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const wsRes = await pool.query(
      "SELECT dir_path FROM workspaces WHERE id=$1 AND user_id=$2 AND status='active'",
      [id, user.id]
    );
    if (!wsRes.rows.length) return NextResponse.json({ error: "워크스페이스를 찾을 수 없습니다." }, { status: 404 });

    const base = wsRes.rows[0].dir_path;
    const body = await request.json();
    const { action, path: relPath, content, name } = body;

    const target = relPath ? safeJoin(base, relPath) : null;
    if (relPath && !target) return NextResponse.json({ error: "잘못된 경로입니다." }, { status: 400 });

    if (action === "write" && target) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content ?? "", "utf8");
      return NextResponse.json({ ok: true });
    }

    if (action === "mkdir" && target) {
      fs.mkdirSync(target, { recursive: true });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete" && target) {
      if (!fs.existsSync(target)) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
      fs.rmSync(target, { recursive: true, force: true });
      return NextResponse.json({ ok: true });
    }

    if (action === "rename" && target && name) {
      const newTarget = safeJoin(path.dirname(target), name);
      if (!newTarget) return NextResponse.json({ error: "잘못된 이름입니다." }, { status: 400 });
      fs.renameSync(target, newTarget);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "잘못된 액션입니다." }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
