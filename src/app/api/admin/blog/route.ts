import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

async function ensureTable() {
  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT,
      content TEXT NOT NULL,
      cover_image TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      tags TEXT,
      author_email TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT,
      published_at BIGINT
    )
  `);
  return pool;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const adminMode = searchParams.get("admin") === "1";

  if (adminMode) {
    const db = getDB(request);
    const session = await getSessionFromRequest(request);
    const check = await requireAdmin(db, session);
    if (!check.ok) return check.response;

    try {
      const pool = await ensureTable();
      const result = await pool.query(`SELECT * FROM blog_posts ORDER BY created_at DESC LIMIT 200`);
      return NextResponse.json({ posts: result.rows });
    } catch {
      return NextResponse.json({ posts: [] });
    }
  }

  try {
    const pool = await ensureTable();
    const result = await pool.query(
      `SELECT id, slug, title, excerpt, cover_image, tags, author_email, created_at, published_at
       FROM blog_posts WHERE status='published' ORDER BY published_at DESC LIMIT 50`
    );
    return NextResponse.json({ posts: result.rows });
  } catch {
    return NextResponse.json({ posts: [] });
  }
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { slug, title, excerpt, content, cover_image, status = "draft", tags } = await request.json();
  if (!slug?.trim() || !title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "슬러그, 제목, 내용을 입력하세요." }, { status: 400 });
  }

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");

  try {
    const pool = await ensureTable();
    const now = Date.now();
    const result = await pool.query(
      `INSERT INTO blog_posts (slug, title, excerpt, content, cover_image, status, tags, author_email, created_at, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [cleanSlug, title.trim(), excerpt?.trim() || null, content.trim(),
       cover_image || null, status, tags?.trim() || null, check.email, now,
       status === "published" ? now : null]
    );
    return NextResponse.json({ ok: true, id: result.rows[0].id, slug: cleanSlug });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "23505") {
      return NextResponse.json({ error: "이미 사용 중인 슬러그입니다." }, { status: 409 });
    }
    console.error("Blog create error:", e);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
