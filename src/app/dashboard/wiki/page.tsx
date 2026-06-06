"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ShareButton } from "@/components/share-button";

interface Wiki { id: string; name: string; slug: string; description: string; is_public: boolean; created_at: number; share_token?: string | null; }

export default function WikiPage() {
  const [wikis, setWikis] = useState<Wiki[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newWiki, setNewWiki] = useState({ slug: "", name: "", description: "", is_public: false });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/v1/wiki").then(r => r.json()).then(d => {
      if (d.wikis) setWikis(d.wikis);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function createWiki() {
    if (submitting) return;
    setError("");
    setSubmitting(true);
    const r = await fetch("/api/v1/wiki", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newWiki),
    });
    const d = await r.json();
    if (!r.ok) { setError(d.error ?? "오류"); setSubmitting(false); return; }
    if (d.wiki) { setWikis(prev => [d.wiki, ...prev]); setShowNew(false); setNewWiki({ slug: "", name: "", description: "", is_public: false }); }
    setSubmitting(false);
  }

  async function deleteWiki(id: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/wiki/${id}`, { method: "DELETE" });
    setWikis(prev => prev.filter(w => w.id !== id));
  }

  return (
    <div style={{ padding: "32px", maxWidth: "800px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "4px" }}>KRL Wiki</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>위키 만들기</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ padding: "8px 20px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.9375rem", fontWeight: 600 }}>+ 새 위키</button>
      </div>

      {showNew && (
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          {error && <div style={{ padding: "8px 12px", background: "#FFF1F2", borderRadius: "6px", color: "#9B1C1C", fontSize: "0.875rem", marginBottom: "10px" }}>{error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input value={newWiki.slug} onChange={e => setNewWiki(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} placeholder="슬러그 (영문, 숫자, -)" style={{ padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", fontSize: "0.9375rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <input value={newWiki.name} onChange={e => setNewWiki(p => ({ ...p, name: e.target.value }))} placeholder="위키 이름" style={{ padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", fontSize: "0.9375rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <input value={newWiki.description} onChange={e => setNewWiki(p => ({ ...p, description: e.target.value }))} placeholder="설명 (선택)" style={{ padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.875rem" }}>
              <input type="checkbox" checked={newWiki.is_public} onChange={e => setNewWiki(p => ({ ...p, is_public: e.target.checked }))} />
              공개
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={createWiki} disabled={submitting} style={{ padding: "8px 16px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>{submitting ? "만드는 중..." : "만들기"}</button>
              <button onClick={() => setShowNew(false)} style={{ padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", background: "var(--color-surface)", cursor: "pointer" }}>취소</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: "var(--color-muted)" }}>로딩 중...</div> : wikis.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--color-muted)" }}>위키가 없습니다.</div>
      ) : wikis.map(wiki => (
        <Link key={wiki.id} href={`/dashboard/wiki/${wiki.id}`} style={{ textDecoration: "none" }}>
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "16px 20px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "12px", transition: "border-color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-hairline)")}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontWeight: 700, color: "var(--color-ink)" }}>{wiki.name}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>/{wiki.slug}</span>
                {wiki.is_public && <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "99px", background: "#10b98120", color: "#10b981", fontWeight: 600 }}>공개</span>}
              </div>
              {wiki.description && <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{wiki.description}</p>}
            </div>
            <div onClick={e => e.preventDefault()} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShareButton type="wiki" id={Number(wiki.id)} initialPublic={wiki.is_public} initialToken={wiki.share_token} />
              <button onClick={e => deleteWiki(wiki.id, e)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "4px" }}>✕</button>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
