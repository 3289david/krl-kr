import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
    const tag = searchParams.get("tag");
    const offset = (page - 1) * limit;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const blogRes = await pool.query("SELECT id FROM blogs WHERE slug = $1 AND is_public = TRUE LIMIT 1", [slug]);
    if (!blogRes.rows[0]) return NextResponse.json({ error: "블로그를 찾을 수 없습니다." }, { status: 404 });
    const blogId = blogRes.rows[0].id;

    let query = "SELECT id, title, slug, excerpt, cover_image, tags, view_count, published_at, created_at FROM blog_posts WHERE blog_id = $1 AND status = 'published'";
    const args: unknown[] = [blogId];
    if (tag) { args.push(tag); query += ` AND $${args.length} = ANY(tags)`; }
    const countRes = await pool.query(query.replace("SELECT id, title, slug, excerpt, cover_image, tags, view_count, published_at, created_at", "SELECT COUNT(*)"), args);
    args.push(limit, offset);
    query += ` ORDER BY published_at DESC NULLS LAST LIMIT $${args.length - 1} OFFSET $${args.length}`;

    const result = await pool.query(query, args);
    const total = Number(countRes.rows[0]?.count ?? 0);

    return NextResponse.json({
      posts: result.rows.map(p => ({
        id: p.id, title: p.title, slug: p.slug, excerpt: p.excerpt,
        cover_image: p.cover_image, tags: p.tags ?? [],
        view_count: p.view_count,
        published_at: p.published_at ? Number(p.published_at) : null,
        created_at: Number(p.created_at),
        url: `https://${slug}.krl.kr/posts/${p.slug}`,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[public/posts GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
