"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Blog {
  id: number; slug: string; title: string; description: string;
  theme: string; primary_color: string; font: string; custom_css: string;
  is_public: boolean; footer_text: string;
}

const THEMES = [
  { id: "default", name: "Default", desc: "깔끔한 화이트" },
  { id: "dark", name: "Dark", desc: "다크 모드" },
  { id: "minimal", name: "Minimal", desc: "미니멀 타이포" },
  { id: "paper", name: "Paper", desc: "따뜻한 종이 느낌" },
  { id: "ocean", name: "Ocean", desc: "딥 오션 다크" },
];

const FONTS = [
  { id: "system", name: "시스템 기본" },
  { id: "serif", name: "Serif (Georgia)" },
  { id: "mono", name: "Monospace" },
  { id: "rounded", name: "Rounded (Nunito)" },
];

export default function BlogSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/v1/blog/${id}`).then(r => r.json()).then(d => setBlog(d.blog)).finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!blog) return;
    setSaving(true); setError("");
    const res = await fetch(`/api/v1/blog/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: blog.title, description: blog.description, theme: blog.theme,
        primary_color: blog.primary_color, font: blog.font, custom_css: blog.custom_css,
        is_public: blog.is_public, footer_text: blog.footer_text,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); }
    else { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!blog || deleteConfirm !== blog.slug) return;
    setDeleting(true);
    await fetch(`/api/v1/blog/${id}`, { method: "DELETE" });
    router.push("/dashboard/blog");
  }

  if (loading || !blog) return <div className="dashboard-page"><p style={{ color: "var(--color-muted)" }}>불러오는 중...</p></div>;

  function upd(field: keyof Blog, val: unknown) { setBlog(b => b ? { ...b, [field]: val } : b); }

  return (
    <div className="dashboard-page" style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href={`/dashboard/blog/${id}`} style={{ fontSize: "0.8125rem", color: "var(--color-muted)", textDecoration: "none" }}>← 글 목록</Link>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", margin: "8px 0 4px" }}>블로그 설정</h1>
        <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>{blog.slug}.krl.kr</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Basic info */}
        <section style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 12, padding: "20px 24px" }}>
          <h3 style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: 16 }}>기본 정보</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: 5 }}>블로그 이름</label>
              <input className="input" value={blog.title} onChange={e => upd("title", e.target.value)} required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: 5 }}>설명</label>
              <textarea className="input" value={blog.description ?? ""} onChange={e => upd("description", e.target.value)} rows={2} style={{ resize: "vertical" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: 5 }}>푸터 텍스트</label>
              <input className="input" value={blog.footer_text ?? ""} onChange={e => upd("footer_text", e.target.value)} placeholder={`Powered by <a href="https://krl.kr">KRL Blog</a>`} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" id="is_public" checked={blog.is_public} onChange={e => upd("is_public", e.target.checked)} style={{ width: 16, height: 16 }} />
              <label htmlFor="is_public" style={{ fontSize: "0.9375rem" }}>블로그 공개</label>
            </div>
          </div>
        </section>

        {/* Theme */}
        <section style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 12, padding: "20px 24px" }}>
          <h3 style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: 16 }}>테마 & 디자인</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: 8 }}>테마</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                {THEMES.map(t => (
                  <button key={t.id} type="button" onClick={() => upd("theme", t.id)}
                    style={{ padding: "10px 12px", borderRadius: 8, border: `2px solid ${blog.theme === t.id ? "var(--color-ink)" : "var(--color-hairline)"}`, background: blog.theme === t.id ? "var(--color-canvas)" : "none", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{t.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: 5 }}>주 색상</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={blog.primary_color} onChange={e => upd("primary_color", e.target.value)} style={{ width: 40, height: 36, border: "1px solid var(--color-hairline)", borderRadius: 6, cursor: "pointer", padding: 2 }} />
                  <input className="input" value={blog.primary_color} onChange={e => upd("primary_color", e.target.value)} style={{ width: 110 }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: 5 }}>폰트</label>
                <select className="input" value={blog.font} onChange={e => upd("font", e.target.value)}>
                  {FONTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: 5 }}>커스텀 CSS (VIP)</label>
              <textarea className="input" value={blog.custom_css ?? ""} onChange={e => upd("custom_css", e.target.value)} rows={5} style={{ fontFamily: "monospace", fontSize: "0.875rem", resize: "vertical" }} placeholder="/* 추가 CSS */" />
            </div>
          </div>
        </section>

        <button type="submit" disabled={saving} className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
          {saved ? "✓ 저장됨" : saving ? "저장 중..." : "설정 저장"}
        </button>
      </form>

      {/* Danger zone */}
      <div style={{ marginTop: 32, background: "var(--color-surface)", border: "1px solid #fecdd3", borderRadius: 12, padding: "20px 24px" }}>
        <h3 style={{ fontWeight: 600, color: "#dc2626", marginBottom: 12, fontSize: "0.9375rem" }}>위험 구역</h3>
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: 16 }}>블로그를 삭제하면 모든 글과 댓글이 영구적으로 삭제됩니다.</p>
        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: 6 }}>
          확인을 위해 슬러그를 입력하세요: <strong>{blog.slug}</strong>
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={blog.slug} style={{ maxWidth: 200 }} />
          <button disabled={deleteConfirm !== blog.slug || deleting} onClick={handleDelete}
            className="btn btn-sm" style={{ background: "#dc2626", color: "#fff", border: "none", opacity: deleteConfirm !== blog.slug ? 0.5 : 1 }}>
            {deleting ? "삭제 중..." : "블로그 삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}
