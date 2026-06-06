import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `post-${Date.now()}`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    // Verify blog ownership
    const blog = await pool.query("SELECT id FROM blogs WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!blog.rows[0]) return NextResponse.json({ error: "블로그를 찾을 수 없습니다." }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // draft, published, all

    let query = "SELECT id, title, slug, status, published_at, cover_image, tags, view_count, created_at, updated_at FROM blog_posts WHERE blog_id = $1";
    const args: unknown[] = [id];
    if (status && status !== "all") {
      query += " AND status = $2";
      args.push(status);
    }
    query += " ORDER BY created_at DESC";

    const result = await pool.query(query, args);
    return NextResponse.json({ posts: result.rows });
  } catch (err) {
    console.error("[blog posts GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const blog = await pool.query("SELECT id FROM blogs WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!blog.rows[0]) return NextResponse.json({ error: "블로그를 찾을 수 없습니다." }, { status: 404 });

    const body = await request.json();
    const { title = "제목 없음", content = "", slug: rawSlug, cover_image, tags = [], seo_title, seo_description, status = "draft", scheduled_at } = body;

    let slug = rawSlug ? slugify(rawSlug) : slugify(title);

    // Deduplicate slug
    const existing = await pool.query("SELECT slug FROM blog_posts WHERE blog_id = $1 AND slug LIKE $2", [id, `${slug}%`]);
    if (existing.rows.length > 0) {
      const suffixes = existing.rows.map((r: { slug: string }) => {
        const m = r.slug.match(/-(\d+)$/);
        return m ? parseInt(m[1]) : 0;
      });
      slug = `${slug}-${Math.max(...suffixes) + 1}`;
    }

    const now = Date.now();
    const publishedAt = status === "published" ? now : null;

    const result = await pool.query(
      `INSERT INTO blog_posts (blog_id, user_id, title, slug, content, cover_image, tags, seo_title, seo_description, status, published_at, scheduled_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13) RETURNING *`,
      [id, user.id, title.trim(), slug, content, cover_image ?? null, tags, seo_title ?? null, seo_description ?? null, status, publishedAt, scheduled_at ?? null, now]
    );

    return NextResponse.json({ post: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[blog posts POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
