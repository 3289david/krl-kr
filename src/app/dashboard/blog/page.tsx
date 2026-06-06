"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Blog {
  id: number;
  slug: string;
  title: string;
  description?: string;
  theme: string;
  is_public: boolean;
  post_count: number;
  created_at: number;
}

export default function BlogListPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [plan, setPlan] = useState("free");
  const [blogLimit, setBlogLimit] = useState(1);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/v1/blog")
      .then(r => r.json())
      .then(d => {
        setBlogs(d.blogs ?? []);
        setPlan(d.plan ?? "free");
        setBlogLimit(d.blog_limit ?? 1);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim() || !title.trim()) return;
    setError("");
    const res = await fetch("/api/v1/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: slug.trim(), title: title.trim(), description: description.trim() || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setBlogs(prev => [data.blog, ...prev]);
    setCreating(false); setSlug(""); setTitle(""); setDescription("");
  }

  const canCreate = blogs.length < blogLimit;

  if (loading) return <div className="dashboard-page"><p style={{ color: "var(--color-muted)" }}>불러오는 중...</p></div>;

  return (
    <div className="dashboard-page">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 4px" }}>KRL Blog</h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", margin: 0 }}>
            내 블로그 · {blogs.length}/{blogLimit}개
            <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 99, fontSize: "0.75rem", fontWeight: 700, background: plan === "vip" ? "#7c3aed20" : plan === "pro" ? "#2563eb20" : "#6b728020", color: plan === "vip" ? "#7c3aed" : plan === "pro" ? "#2563eb" : "#6b7280", textTransform: "uppercase" }}>{plan}</span>
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setCreating(v => !v)} className="btn btn-primary btn-sm">
            + 새 블로그
          </button>
        )}
      </div>

      {creating && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 16, fontSize: "0.9375rem" }}>새 블로그 만들기</h3>
          {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: 5 }}>슬러그 (주소)</label>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--color-hairline)", borderRadius: 8, overflow: "hidden", background: "var(--color-canvas)" }}>
                  <span style={{ padding: "0 10px", color: "var(--color-muted)", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>krl.kr/</span>
                  <input className="input" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="my-blog" required style={{ border: "none", borderRadius: 0, flex: 1 }} />
                  <span style={{ padding: "0 10px", color: "var(--color-muted)", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>.krl.kr</span>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: 4 }}>소문자, 숫자, 하이픈만 가능</p>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: 5 }}>블로그 이름</label>
                <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="내 블로그" required />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: 5 }}>설명 (선택)</label>
              <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="블로그 소개" />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm">만들기</button>
              <button type="button" onClick={() => setCreating(false)} className="btn btn-sm btn-ghost">취소</button>
            </div>
          </form>
        </div>
      )}

      {blogs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 32px", background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-hairline)" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={1.5} style={{ margin: "0 auto 16px", opacity: 0.4 }}>
            <path d="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>아직 블로그가 없습니다</h3>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>첫 번째 블로그를 만들어보세요!</p>
          {!creating && canCreate && (
            <button onClick={() => setCreating(true)} className="btn btn-primary btn-sm" style={{ marginTop: 20 }}>+ 새 블로그 만들기</button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {blogs.map(blog => (
            <div key={blog.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: "1.0625rem" }}>{blog.title}</span>
                  {!blog.is_public && <span style={{ fontSize: "0.7rem", background: "#fef2f2", color: "#dc2626", padding: "1px 7px", borderRadius: 99, fontWeight: 600 }}>비공개</span>}
                </div>
                <a href={`https://${blog.slug}.krl.kr`} target="_blank" rel="noreferrer" style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{blog.slug}.krl.kr</a>
                {blog.description && <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginTop: 4 }}>{blog.description}</p>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginRight: 8 }}>게시글 {blog.post_count}개</span>
                <Link href={`/dashboard/blog/${blog.id}`} className="btn btn-sm btn-primary">글 관리</Link>
                <a href={`https://${blog.slug}.krl.kr`} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">보기</a>
                <Link href={`/dashboard/blog/${blog.id}/settings`} className="btn btn-sm btn-ghost">설정</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {!canCreate && plan !== "vip" && (
        <div style={{ marginTop: 20, padding: "14px 20px", background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe", fontSize: "0.875rem", color: "#1d4ed8" }}>
          블로그를 더 만들려면 <Link href="/pricing" style={{ fontWeight: 600 }}>플랜을 업그레이드</Link>하세요. (Free: 1개 / Pro: 5개 / VIP: 무제한)
        </div>
      )}
    </div>
  );
}
