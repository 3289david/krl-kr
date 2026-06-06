"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";

interface Post {
  id: number;
  title: string;
  slug: string;
  status: string;
  published_at: number | null;
  tags: string[];
  view_count: number;
  created_at: number;
}

interface Blog { id: number; slug: string; title: string; }

const STATUS_LABEL: Record<string, string> = { published: "발행됨", draft: "임시저장", scheduled: "예약됨" };
const STATUS_COLOR: Record<string, string> = { published: "#16a34a", draft: "#6b7280", scheduled: "#d97706" };

export default function BlogPostsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [blog, setBlog] = useState<Blog | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/blog/${id}`).then(r => r.json()),
      fetch(`/api/v1/blog/${id}/posts`).then(r => r.json()),
    ]).then(([blogData, postsData]) => {
      setBlog(blogData.blog);
      setPosts(postsData.posts ?? []);
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleDelete(postId: number) {
    if (!confirm("이 글을 삭제하시겠습니까?")) return;
    setDeleting(postId);
    await fetch(`/api/v1/blog/${id}/posts/${postId}`, { method: "DELETE" });
    setPosts(prev => prev.filter(p => p.id !== postId));
    setDeleting(null);
  }

  async function togglePublish(post: Post) {
    const newStatus = post.status === "published" ? "draft" : "published";
    await fetch(`/api/v1/blog/${id}/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p));
  }

  const filtered = filter === "all" ? posts : posts.filter(p => p.status === filter);

  if (loading) return <div className="dashboard-page"><p style={{ color: "var(--color-muted)" }}>불러오는 중...</p></div>;

  return (
    <div className="dashboard-page">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginBottom: 6 }}>
            <Link href="/dashboard/blog" style={{ color: "var(--color-muted)" }}>← 내 블로그</Link>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 4px" }}>{blog?.title ?? "블로그"}</h1>
          <a href={`https://${blog?.slug}.krl.kr`} target="_blank" rel="noreferrer" style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{blog?.slug}.krl.kr</a>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/dashboard/blog/${id}/settings`} className="btn btn-sm btn-ghost">설정</Link>
          <Link href={`/dashboard/blog/${id}/editor`} className="btn btn-sm btn-primary">+ 새 글</Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--color-hairline)", paddingBottom: 0 }}>
        {["all", "published", "draft"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "8px 16px", background: "none", border: "none", cursor: "pointer", fontWeight: filter === f ? 600 : 400, color: filter === f ? "var(--color-ink)" : "var(--color-muted)", borderBottom: `2px solid ${filter === f ? "var(--color-ink)" : "transparent"}`, fontSize: "0.875rem" }}>
            {f === "all" ? "전체" : f === "published" ? "발행됨" : "임시저장"}
            <span style={{ marginLeft: 6, fontSize: "0.75rem", color: "var(--color-muted)" }}>
              {f === "all" ? posts.length : posts.filter(p => p.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 32px", background: "var(--color-surface)", borderRadius: 14, border: "1px solid var(--color-hairline)" }}>
          <p style={{ color: "var(--color-muted)", marginBottom: 16 }}>글이 없습니다.</p>
          <Link href={`/dashboard/blog/${id}/editor`} className="btn btn-sm btn-primary">첫 글 작성하기</Link>
        </div>
      ) : (
        <div style={{ background: "var(--color-surface)", borderRadius: 14, border: "1px solid var(--color-hairline)", overflow: "hidden" }}>
          {filtered.map((post, i) => (
            <div key={post.id} style={{ padding: "14px 20px", borderBottom: i < filtered.length - 1 ? "1px solid var(--color-hairline)" : "none", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: 4 }}>{post.title}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--color-muted)", display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ color: STATUS_COLOR[post.status] ?? "#6b7280", fontWeight: 600, fontSize: "0.75rem" }}>● {STATUS_LABEL[post.status] ?? post.status}</span>
                  <span>{new Date(post.published_at ?? post.created_at).toLocaleDateString("ko-KR")}</span>
                  <span>조회 {post.view_count}</span>
                </div>
                {post.tags?.length > 0 && (
                  <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                    {post.tags.map(t => <span key={t} style={{ fontSize: "0.7rem", background: "#eff6ff", color: "#2563eb", padding: "1px 7px", borderRadius: 99, fontWeight: 600 }}>#{t}</span>)}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {post.status === "published" && (
                  <a href={`https://${blog?.slug}.krl.kr/posts/${post.slug}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost" style={{ fontSize: "0.75rem" }}>보기</a>
                )}
                <Link href={`/dashboard/blog/${id}/editor/${post.id}`} className="btn btn-sm btn-ghost" style={{ fontSize: "0.75rem" }}>편집</Link>
                <button onClick={() => togglePublish(post)} className="btn btn-sm btn-ghost" style={{ fontSize: "0.75rem" }}>
                  {post.status === "published" ? "내리기" : "발행"}
                </button>
                <button onClick={() => handleDelete(post.id)} disabled={deleting === post.id} className="btn btn-sm btn-ghost" style={{ color: "#dc2626", fontSize: "0.75rem" }}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
