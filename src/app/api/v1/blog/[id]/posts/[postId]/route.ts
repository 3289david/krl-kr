import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; postId: string }> }) {
  try {
    const { id, postId } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const result = await pool.query(
      "SELECT bp.* FROM blog_posts bp JOIN blogs b ON b.id = bp.blog_id WHERE bp.id = $1 AND bp.blog_id = $2 AND b.user_id = $3",
      [postId, id, user.id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });

    return NextResponse.json({ post: result.rows[0] });
  } catch (err) {
    console.error("[blog posts/[postId] GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; postId: string }> }) {
  try {
    const { id, postId } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const body = await request.json();
    const { title, content, cover_image, tags, seo_title, seo_description, status, scheduled_at, excerpt } = body;

    // Get current post to determine published_at
    const current = await pool.query(
      "SELECT bp.status, bp.published_at FROM blog_posts bp JOIN blogs b ON b.id = bp.blog_id WHERE bp.id = $1 AND bp.blog_id = $2 AND b.user_id = $3",
      [postId, id, user.id]
    );
    if (!current.rows[0]) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });

    const now = Date.now();
    // Set published_at when first publishing
    let publishedAt: number | null = current.rows[0].published_at;
    if (status === "published" && !publishedAt) publishedAt = now;
    if (status === "draft") publishedAt = null;

    const result = await pool.query(
      `UPDATE blog_posts SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        cover_image = COALESCE($3, cover_image),
        tags = COALESCE($4, tags),
        seo_title = COALESCE($5, seo_title),
        seo_description = COALESCE($6, seo_description),
        excerpt = COALESCE($7, excerpt),
        status = COALESCE($8, status),
        published_at = $9,
        scheduled_at = COALESCE($10, scheduled_at),
        updated_at = $11
       WHERE id = $12 RETURNING *`,
      [title, content, cover_image, tags, seo_title, seo_description, excerpt, status, publishedAt, scheduled_at, now, postId]
    );

    return NextResponse.json({ post: result.rows[0] });
  } catch (err) {
    console.error("[blog posts/[postId] PATCH]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; postId: string }> }) {
  try {
    const { id, postId } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    await pool.query(
      "DELETE FROM blog_posts WHERE id = $1 AND blog_id = $2 AND user_id = $3",
      [postId, id, user.id]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[blog posts/[postId] DELETE]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
