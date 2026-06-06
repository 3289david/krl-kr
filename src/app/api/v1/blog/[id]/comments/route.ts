import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const blog = await pool.query("SELECT id FROM blogs WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!blog.rows[0]) return NextResponse.json({ error: "블로그를 찾을 수 없습니다." }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "all";

    let query = `SELECT bc.id, bc.post_id, bc.author_name, bc.author_email, bc.content, bc.status, bc.created_at,
                        bp.title AS post_title, bp.slug AS post_slug
                 FROM blog_comments bc
                 JOIN blog_posts bp ON bc.post_id = bp.id
                 WHERE bp.blog_id = $1`;
    const args: unknown[] = [id];

    if (status !== "all") {
      args.push(status);
      query += ` AND bc.status = $${args.length}`;
    }
    query += " ORDER BY bc.created_at DESC LIMIT 200";

    const result = await pool.query(query, args);
    return NextResponse.json({ comments: result.rows });
  } catch (err) {
    console.error("[blog/comments GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { comment_id } = await request.json();

    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const blog = await pool.query("SELECT id FROM blogs WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!blog.rows[0]) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

    const check = await pool.query(
      `SELECT bc.id FROM blog_comments bc
       JOIN blog_posts bp ON bc.post_id = bp.id
       WHERE bc.id = $1 AND bp.blog_id = $2`,
      [comment_id, id]
    );
    if (!check.rows[0]) return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });

    await pool.query("DELETE FROM blog_comments WHERE id = $1", [comment_id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[blog/comments DELETE]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
