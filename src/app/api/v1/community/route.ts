/**
 * KRL.KR — Community Posts API
 * GET  /api/v1/community?board=free&page=1&limit=20
 * POST /api/v1/community  (auth required)
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth, getSessionFromRequest } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import { z } from "zod";

const BOARDS = ["notice", "free", "feature"] as const;
type Board = (typeof BOARDS)[number];

const CreatePostSchema = z.object({
  board: z.enum(BOARDS),
  title: z.string().min(1, "제목을 입력하세요.").max(200, "제목은 200자 이하로 입력하세요."),
  content: z.string().min(1, "내용을 입력하세요.").max(10000, "내용은 10000자 이하로 입력하세요."),
});

function toNum(v: unknown) { return v != null ? Number(v) : null; }

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { searchParams } = request.nextUrl;
    const board = (searchParams.get("board") || "free") as Board;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
    const offset = (page - 1) * limit;

    if (!BOARDS.includes(board)) {
      return NextResponse.json({ error: "유효하지 않은 게시판입니다." }, { status: 400 });
    }

    // Get session for optional auth
    const session = await getSessionFromRequest(request);
    const userId = session?.userId ?? null;

    const result = await db
      .prepare(
        `SELECT p.id, p.board, p.title, p.content, p.view_count, p.like_count, p.comment_count,
                p.is_pinned, p.created_at, p.updated_at,
                u.id AS author_id, u.name AS author_name, u.email AS author_email,
                ${userId ? `EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked` : "false AS liked"}
         FROM community_posts p
         JOIN users u ON u.id = p.user_id
         WHERE p.board = ? AND p.is_deleted = 0
         ORDER BY p.is_pinned DESC, p.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(...(userId ? [userId, board, limit, offset] : [board, limit, offset]))
      .all<Record<string, unknown>>();

    const countRow = await db
      .prepare("SELECT COUNT(*) AS cnt FROM community_posts WHERE board = ? AND is_deleted = 0")
      .bind(board)
      .first<{ cnt: number }>();

    const total = Number(countRow?.cnt ?? 0);

    return NextResponse.json({
      posts: result.results.map((p) => ({
        id: p.id,
        board: p.board,
        title: p.title,
        content_preview: (p.content as string).slice(0, 200),
        view_count: toNum(p.view_count),
        like_count: toNum(p.like_count),
        comment_count: toNum(p.comment_count),
        is_pinned: Boolean(p.is_pinned),
        liked: Boolean(p.liked),
        created_at: toNum(p.created_at),
        updated_at: toNum(p.updated_at),
        author: {
          id: p.author_id,
          name: p.author_name || (p.author_email as string).split("@")[0],
        },
      })),
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[community GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const parsed = CreatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { board, title, content } = parsed.data;

    // Only admin email can post in 'notice' board
    const isAdmin = user.email === process.env.ADMIN_EMAIL;
    if (board === "notice" && !isAdmin) {
      return NextResponse.json({ error: "공지사항은 관리자만 작성할 수 있습니다." }, { status: 403 });
    }

    const now = Date.now();
    const id = generateId();

    await db
      .prepare(
        `INSERT INTO community_posts (id, user_id, board, title, content, view_count, like_count, comment_count, is_pinned, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, ?)`
      )
      .bind(id, user.id, board, title, content, now, now)
      .run();

    return NextResponse.json({ id, board, title }, { status: 201 });
  } catch (err) {
    console.error("[community POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
