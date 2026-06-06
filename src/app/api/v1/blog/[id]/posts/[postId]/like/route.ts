import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const { id, postId } = await params;
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const result = await pool.query(
      `UPDATE blog_posts SET like_count = like_count + 1
       WHERE id = $1 AND blog_id = $2 AND status = 'published'
       RETURNING like_count`,
      [postId, id]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ like_count: result.rows[0].like_count });
  } catch (err) {
    console.error("[post/like POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
