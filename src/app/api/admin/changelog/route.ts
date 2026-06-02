import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

async function ensureTable() {
  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS changelog_entries (
      id SERIAL PRIMARY KEY,
      version TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'feature',
      published BOOLEAN NOT NULL DEFAULT true,
      created_by TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT
    )
  `);
  return pool;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const adminOnly = searchParams.get("admin") === "1";

  if (adminOnly) {
    const db = getDB(request);
    const session = await getSessionFromRequest(request);
    const check = await requireAdmin(db, session);
    if (!check.ok) return check.response;
  }

  try {
    const pool = await ensureTable();
    const where = adminOnly ? "" : "WHERE published = true";
    const result = await pool.query(
      `SELECT * FROM changelog_entries ${where} ORDER BY created_at DESC LIMIT 200`
    );
    return NextResponse.json({ entries: result.rows });
  } catch {
    return NextResponse.json({ entries: [] });
  }
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { version, title, content, type = "feature", published = true } = await request.json();
  if (!version?.trim() || !title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "버전, 제목, 내용을 입력하세요." }, { status: 400 });
  }

  try {
    const pool = await ensureTable();
    const result = await pool.query(
      `INSERT INTO changelog_entries (version, title, content, type, published, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [version.trim(), title.trim(), content.trim(), type, published, check.email, Date.now()]
    );
    return NextResponse.json({ ok: true, id: result.rows[0].id });
  } catch (e) {
    console.error("Changelog create error:", e);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
