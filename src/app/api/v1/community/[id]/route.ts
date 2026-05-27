/**
 * KRL.KR — Single community post
 * GET    /api/v1/community/[id]   (public, increments view)
 * PATCH  /api/v1/community/[id]   (owner only)
 * DELETE /api/v1/community/[id]   (owner only)
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth, getSessionFromRequest } from "@/lib/auth";
import { z } from "zod";

function toNum(v: unknown) { return v != null ? Number(v) : null; }

const UpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDB(request);
    const { id } = await params;
    const session = await getSessionFromRequest(request);
    const userId = session?.userId ?? null;

    const post = await db
      .prepare(
        `SELECT p.id, p.board, p.title, p.content, p.view_count, p.like_count, p.comment_count,
                p.is_pinned, p.is_deleted, p.created_at, p.updated_at,
                u.id AS author_id, u.name AS author_name, u.email AS author_email,
                ${userId ? `EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked,` : "false AS liked,"}
                ${userId ? `(p.user_id = ?) AS is_own` : "false AS is_own"}
         FROM community_posts p JOIN users u ON u.id = p.user_id
         WHERE p.id = ? AND p.is_deleted = 0`
      )
      .bind(...(userId ? [userId, userId, id] : [id]))
      .first<Record<string, unknown>>();

    if (!post) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });

    // Increment view count (fire-and-forget)
    db.prepare("UPDATE community_posts SET view_count = view_count + 1 WHERE id = ?")
      .bind(id).run().catch(() => {});

    return NextResponse.json({
      id: post.id,
      board: post.board,
      title: post.title,
      content: post.content,
      view_count: toNum(post.view_count),
      like_count: toNum(post.like_count),
      comment_count: toNum(post.comment_count),
      is_pinned: Boolean(post.is_pinned),
      liked: Boolean(post.liked),
      is_own: Boolean(post.is_own),
      created_at: toNum(post.created_at),
      updated_at: toNum(post.updated_at),
      author: {
        id: post.author_id,
        name: (post.author_name as string) || (post.author_email as string).split("@")[0],
      },
    });
  } catch (err) {
    console.error("[community/[id] GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;
    const { id } = await params;

    const post = await db
      .prepare("SELECT user_id FROM community_posts WHERE id = ? AND is_deleted = 0")
      .bind(id).first<{ user_id: string }>();

    if (!post) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    const isAdmin = user.email === process.env.ADMIN_EMAIL;
    if (post.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const fields: string[] = [];
    const vals: unknown[] = [];
    if (parsed.data.title !== undefined) { fields.push("title = ?"); vals.push(parsed.data.title); }
    if (parsed.data.content !== undefined) { fields.push("content = ?"); vals.push(parsed.data.content); }
    if (fields.length === 0) return NextResponse.json({ error: "변경 사항이 없습니다." }, { status: 400 });
    fields.push("updated_at = ?");
    vals.push(Date.now());
    vals.push(id);

    await db.prepare(`UPDATE community_posts SET ${fields.join(", ")} WHERE id = ?`).bind(...vals).run();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[community/[id] PATCH]", err);
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
    const { id } = await params;

    const post = await db
      .prepare("SELECT user_id FROM community_posts WHERE id = ? AND is_deleted = 0")
      .bind(id).first<{ user_id: string }>();

    if (!post) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    const isAdmin = user.email === process.env.ADMIN_EMAIL;
    if (post.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
    }

    await db
      .prepare("UPDATE community_posts SET is_deleted = 1, updated_at = ? WHERE id = ?")
      .bind(Date.now(), id).run();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[community/[id] DELETE]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
