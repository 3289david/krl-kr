"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Site { id: string; slug: string; name: string; description: string; is_public: boolean; theme: string; primary_color: string; updated_at: number; }

export default function SpacePage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newSite, setNewSite] = useState({ slug: "", name: "", description: "", theme: "default", primary_color: "#6366f1" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/v1/space").then(r => r.json()).then(d => {
      if (d.sites) setSites(d.sites);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function createSite() {
    if (submitting) return;
    setError("");
    setSubmitting(true);
    const r = await fetch("/api/v1/space", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSite),
    });
    const d = await r.json();
    if (!r.ok) { setError(d.error ?? "오류"); setSubmitting(false); return; }
    if (d.site) { window.location.href = `/dashboard/space/${d.site.id}`; }
    setSubmitting(false);
  }

  async function deleteSite(id: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm("사이트를 삭제하시겠습니까?")) return;
    await fetch(`/api/v1/space/${id}`, { method: "DELETE" });
    setSites(prev => prev.filter(s => s.id !== id));
  }

  async function togglePublic(site: Site, e: React.MouseEvent) {
    e.preventDefault();
    const r = await fetch(`/api/v1/space/${site.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: !site.is_public }),
    });
    const d = await r.json();
    if (d.site) setSites(prev => prev.map(s => s.id === site.id ? d.site : s));
  }

  return (
    <div className="space-page" style={{ padding: "32px", maxWidth: "1000px" }}>
      <style>{`
        @media (max-width: 640px) {
          .space-page { padding: 16px !important; }
          .space-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px; }
          .space-new-btn { width: 100%; text-align: center; }
          .space-form-row { flex-direction: column !important; }
        }
      `}</style>
      <div className="space-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "4px" }}>KRL Space</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>웹사이트 빌더</p>
        </div>
        <button onClick={() => setShowNew(true)} className="space-new-btn" style={{ padding: "8px 20px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.9375rem", fontWeight: 600 }}>+ 새 사이트</button>
      </div>

      {showNew && (
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          {error && <div style={{ padding: "8px 12px", background: "#FFF1F2", borderRadius: "6px", color: "#9B1C1C", fontSize: "0.875rem", marginBottom: "10px" }}>{error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div className="space-form-row" style={{ display: "flex", gap: "8px" }}>
              <input value={newSite.slug} onChange={e => setNewSite(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} placeholder="슬러그 (영문소문자, 숫자, -)" style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", fontSize: "0.9375rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
              <input value={newSite.name} onChange={e => setNewSite(p => ({ ...p, name: e.target.value }))} placeholder="사이트 이름" style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", fontSize: "0.9375rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            </div>
            <input value={newSite.description} onChange={e => setNewSite(p => ({ ...p, description: e.target.value }))} placeholder="설명 (선택)" style={{ padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <label style={{ fontSize: "0.875rem" }}>기본 색상:</label>
              <input type="color" value={newSite.primary_color} onChange={e => setNewSite(p => ({ ...p, primary_color: e.target.value }))} style={{ width: "40px", height: "32px", border: "none", cursor: "pointer", borderRadius: "4px", padding: 0 }} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={createSite} disabled={submitting} style={{ padding: "8px 16px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>{submitting ? "만드는 중..." : "만들기"}</button>
              <button onClick={() => setShowNew(false)} style={{ padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", background: "var(--color-surface)", cursor: "pointer" }}>취소</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: "var(--color-muted)" }}>로딩 중...</div> : sites.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--color-muted)" }}>사이트가 없습니다.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {sites.map(site => (
            <Link key={site.id} href={`/dashboard/space/${site.id}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", overflow: "hidden", transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = site.primary_color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-hairline)")}
              >
                <div style={{ height: "80px", background: `linear-gradient(135deg, ${site.primary_color}20 0%, ${site.primary_color}40 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: site.primary_color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "white", fontWeight: 700, fontSize: "1.1rem" }}>{site.name[0]?.toUpperCase()}</span>
                  </div>
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontWeight: 700, color: "var(--color-ink)", marginBottom: "2px" }}>{site.name}</p>
                      <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>/{site.slug}</p>
                    </div>
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      <button onClick={e => togglePublic(site, e)} style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "99px", background: site.is_public ? "#10b98120" : "var(--color-surface)", color: site.is_public ? "#10b981" : "var(--color-muted)", border: `1px solid ${site.is_public ? "#10b98140" : "var(--color-hairline)"}`, cursor: "pointer", fontWeight: 600 }}>
                        {site.is_public ? "공개" : "비공개"}
                      </button>
                      <button onClick={e => deleteSite(site.id, e)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "2px", fontSize: "0.8rem" }}>✕</button>
                    </div>
                  </div>
                  {site.description && <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginTop: "4px" }}>{site.description}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
