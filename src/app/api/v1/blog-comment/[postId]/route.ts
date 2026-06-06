import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;
    const { author_name, author_email, content } = await request.json();

    if (!author_name?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "이름과 댓글을 입력하세요." }, { status: 400 });
    }
    if (content.length > 1000) {
      return NextResponse.json({ error: "댓글은 1000자 이하로 작성하세요." }, { status: 400 });
    }

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const post = await pool.query(
      "SELECT id FROM blog_posts WHERE id = $1 AND status = 'published'",
      [postId]
    );
    if (!post.rows[0]) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });

    await pool.query(
      "INSERT INTO blog_comments (post_id, author_name, author_email, content, status, created_at) VALUES ($1, $2, $3, $4, 'pending', $5)",
      [postId, author_name.trim().slice(0, 50), author_email?.trim() ?? null, content.trim(), Date.now()]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[blog-comment POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "pending";

    const result = await pool.query(
      "SELECT * FROM blog_comments WHERE post_id = $1 AND status = $2 ORDER BY created_at DESC",
      [postId, status]
    );
    return NextResponse.json({ comments: result.rows });
  } catch (err) {
    console.error("[blog-comment GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;
    const { comment_id, status } = await request.json();
    if (!["approved", "spam", "pending"].includes(status)) {
      return NextResponse.json({ error: "잘못된 상태" }, { status: 400 });
    }
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    await pool.query(
      "UPDATE blog_comments SET status = $1 WHERE id = $2 AND post_id = $3",
      [status, comment_id, postId]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[blog-comment PATCH]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
