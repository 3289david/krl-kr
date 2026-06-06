import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const result = await pool.query(
      `SELECT id, slug, title, description, theme, primary_color, font, is_public, footer_text, custom_domain, created_at, updated_at,
        (SELECT COUNT(*) FROM blog_posts WHERE blog_id = blogs.id AND status = 'published') AS post_count
       FROM blogs WHERE slug = $1 AND is_public = TRUE LIMIT 1`,
      [slug]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: "블로그를 찾을 수 없습니다." }, { status: 404 });
    }

    const blog = result.rows[0];
    return NextResponse.json({
      blog: {
        id: blog.id,
        slug: blog.slug,
        title: blog.title,
        description: blog.description,
        theme: blog.theme,
        primary_color: blog.primary_color,
        font: blog.font,
        is_public: blog.is_public,
        footer_text: blog.footer_text,
        custom_domain: blog.custom_domain,
        post_count: Number(blog.post_count),
        url: blog.custom_domain ? `https://${blog.custom_domain}` : `https://${blog.slug}.krl.kr`,
        rss_url: blog.custom_domain ? `https://${blog.custom_domain}/rss.xml` : `https://${blog.slug}.krl.kr/rss.xml`,
        created_at: Number(blog.created_at),
        updated_at: Number(blog.updated_at),
      }
    });
  } catch (err) {
    console.error("[public/blog GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
