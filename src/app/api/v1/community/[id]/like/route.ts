/**
 * KRL.KR — Post Like Toggle
 * POST /api/v1/community/[id]/like  (auth required)
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;
    const { id: postId } = await params;

    const post = await db
      .prepare("SELECT id, like_count FROM community_posts WHERE id = ? AND is_deleted = 0")
      .bind(postId).first<{ id: string; like_count: number }>();
    if (!post) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });

    const existing = await db
      .prepare("SELECT post_id FROM community_likes WHERE post_id = ? AND user_id = ?")
      .bind(postId, user.id).first<{ post_id: string }>();

    if (existing) {
      // Unlike
      await db.prepare("DELETE FROM community_likes WHERE post_id = ? AND user_id = ?").bind(postId, user.id).run();
      await db.prepare("UPDATE community_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = ?").bind(postId).run();
      return NextResponse.json({ liked: false, like_count: Math.max(0, Number(post.like_count) - 1) });
    } else {
      // Like
      await db
        .prepare("INSERT INTO community_likes (post_id, user_id, created_at) VALUES (?, ?, ?)")
        .bind(postId, user.id, Date.now()).run();
      await db.prepare("UPDATE community_posts SET like_count = like_count + 1 WHERE id = ?").bind(postId).run();
      return NextResponse.json({ liked: true, like_count: Number(post.like_count) + 1 });
    }
  } catch (err) {
    console.error("[like POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
