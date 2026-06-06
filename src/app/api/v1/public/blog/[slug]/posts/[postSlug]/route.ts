import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; postSlug: string }> }) {
  try {
    const { slug, postSlug } = await params;
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const blogRes = await pool.query("SELECT id FROM blogs WHERE slug = $1 AND is_public = TRUE LIMIT 1", [slug]);
    if (!blogRes.rows[0]) return NextResponse.json({ error: "블로그를 찾을 수 없습니다." }, { status: 404 });

    const result = await pool.query(
      "SELECT id, title, slug, content, excerpt, cover_image, tags, view_count, seo_title, seo_description, published_at, created_at FROM blog_posts WHERE blog_id = $1 AND slug = $2 AND status = 'published' LIMIT 1",
      [blogRes.rows[0].id, postSlug]
    );

    if (!result.rows[0]) return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });

    const p = result.rows[0];
    return NextResponse.json({
      post: {
        id: p.id, title: p.title, slug: p.slug, content: p.content,
        excerpt: p.excerpt, cover_image: p.cover_image, tags: p.tags ?? [],
        view_count: p.view_count, seo_title: p.seo_title, seo_description: p.seo_description,
        published_at: p.published_at ? Number(p.published_at) : null,
        created_at: Number(p.created_at),
        url: `https://${slug}.krl.kr/posts/${p.slug}`,
      }
    });
  } catch (err) {
    console.error("[public/post GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
