import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "블로그 | KRL.KR",
  description: "KRL.KR 팀의 블로그 — 개발 이야기, 서비스 소개, 사용 팁을 공유합니다.",
};

export const revalidate = 60;

interface Post {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  tags: string | null;
  author_email: string;
  published_at: number;
}

async function fetchPosts(): Promise<Post[]> {
  try {
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
        excerpt TEXT, content TEXT NOT NULL, cover_image TEXT,
        status TEXT NOT NULL DEFAULT 'draft', tags TEXT, author_email TEXT NOT NULL,
        created_at BIGINT NOT NULL, updated_at BIGINT, published_at BIGINT
      )
    `);
    const result = await pool.query(
      `SELECT id, slug, title, excerpt, cover_image, tags, author_email, published_at
       FROM blog_posts WHERE status='published' ORDER BY published_at DESC LIMIT 50`
    );
    return result.rows as Post[];
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const posts = await fetchPosts();

  return (
    <main style={{ minHeight: "100vh", background: "var(--color-canvas)" }}>
      <style>{`.blog-card-link:hover article{box-shadow:0 4px 20px rgba(0,0,0,0.08);transform:translateY(-2px)}`}</style>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "60px 24px 100px" }}>

        <div style={{ marginBottom: "48px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: "10px" }}>블로그</h1>
          <p style={{ fontSize: "1rem", color: "var(--color-muted)" }}>
            KRL.KR 팀의 개발 이야기, 서비스 소개, 사용 팁을 공유합니다.
          </p>
        </div>

        {posts.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "80px 24px",
            background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
            borderRadius: "20px",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>✍️</div>
            <p style={{ fontWeight: 600, fontSize: "1.0625rem", marginBottom: "8px" }}>아직 게시글이 없습니다</p>
            <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>곧 첫 번째 포스트가 올라올 예정입니다.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {posts.map((post, i) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="blog-card-link" style={{ textDecoration: "none" }}>
                <article style={{
                  display: "flex", gap: "24px",
                  background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
                  borderRadius: "16px", overflow: "hidden",
                  transition: "box-shadow 0.15s ease, transform 0.1s ease",
                }}>
                  {post.cover_image && (
                    <div style={{ width: "200px", flexShrink: 0, overflow: "hidden" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.cover_image} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <div style={{ padding: i === 0 ? "28px" : "20px 24px", flex: 1 }}>
                    {post.tags && (
                      <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
                        {post.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                          <span key={tag} style={{
                            fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px",
                            borderRadius: "99px", background: "var(--color-surface-card)",
                            border: "1px solid var(--color-hairline-strong)",
                            color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
                          }}>{tag}</span>
                        ))}
                      </div>
                    )}
                    <h2 style={{ fontSize: i === 0 ? "1.25rem" : "1rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--color-ink)", marginBottom: "8px", lineHeight: 1.4 }}>
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", lineHeight: 1.6, marginBottom: "14px" }}>
                        {post.excerpt}
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.8125rem", color: "var(--color-ash)" }}>
                      <span>{post.author_email.split("@")[0]}</span>
                      <span>·</span>
                      <span>{new Date(Number(post.published_at)).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
