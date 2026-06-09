"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ShareButton } from "@/components/share-button";

interface Doc { id: string; title: string; is_public: boolean; updated_at: number; share_token?: string | null; }

function fmtDate(ts: number | string | null | undefined): string {
  if (!ts) return "";
  return new Date(Number(ts)).toLocaleDateString("ko-KR");
}

export default function DocsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/docs").then(r => r.json()).then(d => {
      if (d.docs) setDocs(d.docs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function createDoc() {
    const r = await fetch("/api/v1/docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "새 문서" }),
    });
    const d = await r.json();
    if (d.doc) {
      window.location.href = `/dashboard/docs/${d.doc.id}`;
    }
  }

  async function deleteDoc(id: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm("문서를 삭제하시겠습니까?")) return;
    await fetch(`/api/v1/docs/${id}`, { method: "DELETE" });
    setDocs(prev => prev.filter(d => d.id !== id));
  }

  return (
    <div className="docs-page" style={{ padding: "32px", maxWidth: "800px" }}>
      <style>{`
        @media (max-width: 640px) {
          .docs-page { padding: 16px !important; }
          .docs-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px; }
          .docs-new-btn { width: 100%; text-align: center; }
        }
      `}</style>
      <div className="docs-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "4px" }}>KRL Docs</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>마크다운 문서 작성</p>
        </div>
        <button onClick={createDoc} className="docs-new-btn" style={{ padding: "8px 20px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.9375rem", fontWeight: 600 }}>+ 새 문서</button>
      </div>

      {loading ? (
        <div style={{ color: "var(--color-muted)" }}>로딩 중...</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--color-muted)" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: "16px", opacity: 0.4 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <p>아직 문서가 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {docs.map(doc => (
            <Link key={doc.id} href={`/dashboard/docs/${doc.id}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--color-accent)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-hairline)")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" style={{ color: "var(--color-muted)", flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: "var(--color-ink)", marginBottom: "2px" }}>{doc.title}</p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>수정: {fmtDate(doc.updated_at)}</p>
                </div>
                <div onClick={e => e.preventDefault()}>
                  <ShareButton type="doc" id={Number(doc.id)} initialPublic={doc.is_public} initialToken={doc.share_token} />
                </div>
                <button onClick={e => deleteDoc(doc.id, e)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "4px", fontSize: "0.875rem" }}>✕</button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
