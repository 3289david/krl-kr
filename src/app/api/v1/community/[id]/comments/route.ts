/**
 * KRL.KR — Community Comments
 * GET  /api/v1/community/[id]/comments
 * POST /api/v1/community/[id]/comments  (auth required)
 * DELETE /api/v1/community/[id]/comments?comment_id=xxx (owner only)
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId } from "@/lib/utils";

function toNum(v: unknown) { return v != null ? Number(v) : null; }

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDB(request);
    const { id } = await params;

    const result = await db
      .prepare(
        `SELECT c.id, c.content, c.is_deleted, c.created_at,
                u.id AS author_id, u.name AS author_name, u.email AS author_email
         FROM community_comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.post_id = ?
         ORDER BY c.created_at ASC`
      )
      .bind(id)
      .all<Record<string, unknown>>();

    return NextResponse.json({
      comments: result.results.map((c) => ({
        id: c.id,
        content: c.is_deleted ? null : c.content,
        is_deleted: Boolean(c.is_deleted),
        created_at: toNum(c.created_at),
        author: {
          id: c.author_id,
          name: (c.author_name as string) || (c.author_email as string).split("@")[0],
        },
      })),
    });
  } catch (err) {
    console.error("[comments GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

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
      .prepare("SELECT id FROM community_posts WHERE id = ? AND is_deleted = 0")
      .bind(postId).first<{ id: string }>();
    if (!post) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });

    const body = await request.json();
    const content = (body.content || "").trim();
    if (!content) return NextResponse.json({ error: "댓글 내용을 입력하세요." }, { status: 400 });
    if (content.length > 2000) return NextResponse.json({ error: "댓글은 2000자 이하로 입력하세요." }, { status: 400 });

    const now = Date.now();
    const id = generateId();

    await db
      .prepare("INSERT INTO community_comments (id, post_id, user_id, content, is_deleted, created_at) VALUES (?, ?, ?, ?, 0, ?)")
      .bind(id, postId, user.id, content, now).run();

    // Update comment count
    await db
      .prepare("UPDATE community_posts SET comment_count = comment_count + 1, updated_at = ? WHERE id = ?")
      .bind(now, postId).run();

    return NextResponse.json({
      id,
      content,
      created_at: now,
      author: { id: user.id, name: user.name || user.email.split("@")[0] },
    }, { status: 201 });
  } catch (err) {
    console.error("[comments POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;
    const { id: postId } = await params;
    const { searchParams } = request.nextUrl;
    const commentId = searchParams.get("comment_id");
    if (!commentId) return NextResponse.json({ error: "comment_id가 필요합니다." }, { status: 400 });

    const comment = await db
      .prepare("SELECT user_id FROM community_comments WHERE id = ? AND post_id = ? AND is_deleted = 0")
      .bind(commentId, postId).first<{ user_id: string }>();

    if (!comment) return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    const isAdmin = user.email === process.env.ADMIN_EMAIL;
    if (comment.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
    }

    await db.prepare("UPDATE community_comments SET is_deleted = 1 WHERE id = ?").bind(commentId).run();
    await db
      .prepare("UPDATE community_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = ?")
      .bind(postId).run();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[comments DELETE]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
