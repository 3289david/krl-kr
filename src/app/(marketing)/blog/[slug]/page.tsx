import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";

interface Post {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  tags: string | null;
  author_email: string;
  published_at: number;
  updated_at: number | null;
}

async function fetchPost(slug: string): Promise<Post | null> {
  try {
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM blog_posts WHERE slug=$1 AND status='published' LIMIT 1`,
      [slug]
    );
    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) return { title: "Not Found | KRL.KR" };
  return {
    title: `${post.title} | KRL.KR 블로그`,
    description: post.excerpt ?? post.content.slice(0, 160),
    openGraph: { title: post.title, description: post.excerpt ?? undefined, images: post.cover_image ? [post.cover_image] : [] },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) notFound();

  const html = marked(post.content, { breaks: true, gfm: true, async: false });

  return (
    <main style={{ minHeight: "100vh", background: "var(--color-canvas)" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px 100px" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px", fontSize: "0.875rem", color: "var(--color-muted)" }}>
          <Link href="/blog" style={{ color: "var(--color-muted)", textDecoration: "none" }}>블로그</Link>
          <span>›</span>
          <span style={{ color: "var(--color-ink)" }}>{post.title}</span>
        </div>

        {/* Cover image */}
        {post.cover_image && (
          <div style={{ marginBottom: "32px", borderRadius: "16px", overflow: "hidden", border: "1px solid var(--color-hairline)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.cover_image} alt={post.title} style={{ width: "100%", display: "block", maxHeight: "400px", objectFit: "cover" }} />
          </div>
        )}

        {/* Tags */}
        {post.tags && (
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
            {post.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
              <span key={tag} style={{
                fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: "99px",
                background: "var(--color-surface-card)", border: "1px solid var(--color-hairline-strong)",
                color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
              }}>{tag}</span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.3, marginBottom: "16px" }}>
          {post.title}
        </h1>

        {/* Meta */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "40px", paddingBottom: "24px", borderBottom: "1px solid var(--color-hairline)" }}>
          <span>KRL.KR 팀</span>
          <span>·</span>
          <span>{new Date(Number(post.published_at)).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</span>
          {post.updated_at && post.updated_at !== post.published_at && (
            <>
              <span>·</span>
              <span>수정됨 {new Date(Number(post.updated_at)).toLocaleDateString("ko-KR")}</span>
            </>
          )}
        </div>

        {/* Content */}
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: html }}
          style={{
            fontSize: "1rem", lineHeight: 1.8, color: "var(--color-body)",
          }}
        />

        {/* Back link */}
        <div style={{ marginTop: "60px", paddingTop: "32px", borderTop: "1px solid var(--color-hairline)" }}>
          <Link href="/blog" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.875rem", color: "var(--color-muted)", textDecoration: "none" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            블로그 목록으로
          </Link>
        </div>

      </div>

      <style>{`
        .blog-content h1, .blog-content h2, .blog-content h3, .blog-content h4 {
          font-weight: 700; letter-spacing: -0.02em; margin-top: 2em; margin-bottom: 0.5em; color: var(--color-ink);
        }
        .blog-content h1 { font-size: 1.625rem; }
        .blog-content h2 { font-size: 1.375rem; padding-bottom: 8px; border-bottom: 1px solid var(--color-hairline); }
        .blog-content h3 { font-size: 1.125rem; }
        .blog-content h4 { font-size: 1rem; }
        .blog-content p { margin-bottom: 1.25em; }
        .blog-content ul, .blog-content ol { padding-left: 1.5em; margin-bottom: 1.25em; }
        .blog-content li { margin-bottom: 0.4em; }
        .blog-content a { color: var(--color-arc); text-decoration: underline; }
        .blog-content blockquote { margin: 1.5em 0; padding: 12px 20px; border-left: 3px solid var(--color-arc); background: var(--color-lifted); border-radius: 0 8px 8px 0; color: var(--color-muted); }
        .blog-content code { font-family: var(--font-mono); font-size: 0.875em; background: var(--color-lifted); border: 1px solid var(--color-hairline-strong); border-radius: 4px; padding: 2px 5px; }
        .blog-content pre { background: var(--color-ink); border-radius: 12px; padding: 20px; overflow-x: auto; margin-bottom: 1.5em; }
        .blog-content pre code { background: none; border: none; padding: 0; color: #e5e7eb; font-size: 0.875rem; }
        .blog-content img { max-width: 100%; border-radius: 8px; border: 1px solid var(--color-hairline); }
        .blog-content hr { border: none; border-top: 1px solid var(--color-hairline); margin: 2em 0; }
        .blog-content table { width: 100%; border-collapse: collapse; margin-bottom: 1.5em; font-size: 0.9rem; }
        .blog-content th, .blog-content td { border: 1px solid var(--color-hairline-strong); padding: 10px 14px; text-align: left; }
        .blog-content th { background: var(--color-lifted); font-weight: 600; }
      `}</style>
    </main>
  );
}
