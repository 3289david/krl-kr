import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BAD_WORDS = [
  '씨발','씨팔','시발','시팔','씨바','시바','씨빨','ㅆㅂ','ㅅㅂ',
  '개새끼','개색기','개쌔끼','개세끼','개새','ㄱㅅㄲ',
  '병신','빙신','벙신','ㅂㅅ',
  '보지','자지','좆','보×','자×','ㅂㅈ','ㅈㅈ',
  '창녀','창년','창놈',
  '미친놈','미친년','미친새끼','미친ㄴ',
  '찐따','정신병자','등신','멍청이새끼',
  '개년','개놈','개같은',
  '죽어라','뒤져','꺼져','닥쳐새끼',
  'fuck','shit','asshole','bitch','cunt','nigger','faggot',
];

const SPAM_URL_RE = /https?:\/\//gi;
const REPEAT_CHAR_RE = /(.)\1{9,}/;
const REPEAT_PHRASE_RE = /^(.{1,8})\1{4,}$/;

function filterContent(content: string): { blocked: boolean; reason: string } {
  const lower = content.toLowerCase().replace(/\s+/g, '');

  for (const word of BAD_WORDS) {
    if (lower.includes(word.replace(/\s/g, ''))) {
      return { blocked: true, reason: '부적절한 언어가 포함되어 있습니다.' };
    }
  }

  const urlCount = (content.match(SPAM_URL_RE) || []).length;
  if (urlCount >= 2) return { blocked: true, reason: '스팸으로 감지되었습니다.' };

  if (REPEAT_CHAR_RE.test(content)) return { blocked: true, reason: '스팸으로 감지되었습니다.' };
  if (REPEAT_PHRASE_RE.test(content.trim())) return { blocked: true, reason: '스팸으로 감지되었습니다.' };

  return { blocked: false, reason: '' };
}

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

    const filter = filterContent(content);
    if (filter.blocked) {
      return NextResponse.json({ error: filter.reason }, { status: 400 });
    }

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const post = await pool.query(
      "SELECT id FROM blog_posts WHERE id = $1 AND status = 'published'",
      [postId]
    );
    if (!post.rows[0]) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });

    await pool.query(
      "INSERT INTO blog_comments (post_id, author_name, author_email, content, status, created_at) VALUES ($1, $2, $3, $4, 'approved', $5)",
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
    const status = searchParams.get("status") ?? "approved";

    const result = await pool.query(
      "SELECT * FROM blog_comments WHERE post_id = $1 AND status = $2 ORDER BY created_at ASC",
      [postId, status]
    );
    return NextResponse.json({ comments: result.rows });
  } catch (err) {
    console.error("[blog-comment GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;
    const { comment_id } = await request.json();

    const { requireAuth } = await import("@/lib/auth");
    const { getDB } = await import("@/lib/env");
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const check = await pool.query(
      `SELECT bc.id FROM blog_comments bc
       JOIN blog_posts bp ON bc.post_id = bp.id
       JOIN blogs b ON bp.blog_id = b.id
       WHERE bc.id = $1 AND bc.post_id = $2 AND b.user_id = $3`,
      [comment_id, postId, user.id]
    );
    if (!check.rows[0]) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

    await pool.query("DELETE FROM blog_comments WHERE id = $1", [comment_id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[blog-comment DELETE]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
