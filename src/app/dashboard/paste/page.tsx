"use client";
import { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, CopyIcon, CheckIcon, XIcon, ExternalLinkIcon } from "@/components/icons";
import { formatRelativeTime } from "@/lib/utils";

interface PasteData {
  id: string;
  slug: string;
  title: string | null;
  language: string;
  is_public: number;
  expires_at: number | null;
  view_count: number;
  created_at: number;
}

const LANGUAGES = [
  "plaintext", "javascript", "typescript", "python", "html", "css",
  "json", "bash", "sql", "go", "rust", "markdown", "yaml", "xml",
];

export default function PastePage() {
  const [pastes, setPastes] = useState<PasteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/paste")
      .then((r) => r.json())
      .then((d) => setPastes(d.pastes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/v1/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title: title || undefined, language, is_public: isPublic }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "생성에 실패했습니다."); return; }
      setShowCreate(false);
      setContent(""); setTitle("");
      // Refresh list
      const r2 = await fetch("/api/v1/paste");
      if (r2.ok) { const d2 = await r2.json(); setPastes(d2.pastes ?? []); }
    } catch { setError("네트워크 오류가 발생했습니다."); }
    finally { setCreating(false); }
  }

  async function handleCopy(slug: string) {
    await navigator.clipboard.writeText(`https://krl.kr/p/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  async function handleDelete(slug: string) {
    try {
      const res = await fetch(`/api/v1/paste/${slug}`, { method: "DELETE" });
      if (res.ok) setPastes((prev) => prev.filter((p) => p.slug !== slug));
    } catch {}
    setDeleteConfirm(null);
  }

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "4px" }}>Pastebin</h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>코드와 텍스트를 공유하세요.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-pill" style={{ gap: "6px" }}>
          <PlusIcon size={16} />새 페이스트
        </button>
      </div>

      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "64px", textAlign: "center", color: "var(--color-muted)" }}>로딩 중...</div>
        ) : pastes.length === 0 ? (
          <div style={{ padding: "64px", textAlign: "center" }}>
            <p style={{ fontWeight: 500, marginBottom: "8px" }}>페이스트가 없습니다</p>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "20px" }}>새 페이스트를 만들어보세요.</p>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm btn-pill">
              <PlusIcon size={15} />새 페이스트
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>제목</th>
                <th>언어</th>
                <th>공개</th>
                <th>조회수</th>
                <th>생성일</th>
                <th style={{ textAlign: "right" }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {pastes.map((p) => (
                <tr key={p.id}>
                  <td>
                    <a href={`/p/${p.slug}`} target="_blank" rel="noopener" style={{ fontWeight: 600, color: "var(--color-ink)", textDecoration: "none" }}>
                      {p.title || `페이스트 ${p.slug}`}
                    </a>
                    <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}>{p.slug}</p>
                  </td>
                  <td>
                    <span className="badge" style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono)" }}>{p.language}</span>
                  </td>
                  <td>
                    <span className={`badge ${p.is_public ? "badge-success" : "badge"}`} style={{ fontSize: "0.6875rem" }}>
                      {p.is_public ? "공개" : "비공개"}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.875rem" }}>{p.view_count}</td>
                  <td style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                    {formatRelativeTime(p.created_at)}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                      <button onClick={() => handleCopy(p.slug)} className="btn btn-ghost btn-sm btn-icon">
                        {copiedSlug === p.slug ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                      </button>
                      <a href={`/p/${p.slug}`} target="_blank" rel="noopener" className="btn btn-ghost btn-sm btn-icon">
                        <ExternalLinkIcon size={14} />
                      </a>
                      <button onClick={() => setDeleteConfirm(p.slug)} className="btn btn-ghost btn-sm btn-icon" style={{ color: "var(--color-danger)" }}>
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,19,0.5)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={{ background: "var(--color-lifted)", borderRadius: "var(--radius-xl)", padding: "32px", width: "100%", maxWidth: "640px", border: "1px solid var(--color-hairline-strong)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>새 페이스트</h2>
              <button onClick={() => setShowCreate(false)} className="btn btn-ghost btn-icon"><XIcon size={18} /></button>
            </div>
            {error && <div style={{ padding: "12px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "var(--radius-sm)", marginBottom: "16px", color: "#9B1C1C", fontSize: "0.875rem" }}>{error}</div>}
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>제목 (선택)</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="페이스트 제목" className="input" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>언어</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input">
                    {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>내용 *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="코드 또는 텍스트를 입력하세요..."
                  required
                  rows={12}
                  className="input"
                  style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" id="is_public" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} style={{ width: "auto" }} />
                <label htmlFor="is_public" style={{ fontSize: "0.875rem", fontWeight: 500, marginBottom: 0 }}>공개 페이스트</label>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary btn-pill" style={{ flex: 1, justifyContent: "center" }}>취소</button>
                <button type="submit" disabled={creating || !content} className="btn btn-primary btn-pill" style={{ flex: 1, justifyContent: "center" }}>
                  {creating ? "생성 중..." : "페이스트 만들기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,19,0.5)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "var(--color-lifted)", borderRadius: "var(--radius-xl)", padding: "32px", maxWidth: "400px", width: "100%", border: "1px solid var(--color-hairline-strong)" }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "12px" }}>페이스트 삭제</h3>
            <p style={{ color: "var(--color-muted)", marginBottom: "24px" }}>이 페이스트를 삭제하면 복구할 수 없습니다.</p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary btn-pill" style={{ flex: 1, justifyContent: "center" }}>취소</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn btn-pill" style={{ flex: 1, justifyContent: "center", background: "var(--color-danger)", color: "white", border: "none" }}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {copiedSlug && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "var(--color-ink)", color: "var(--color-canvas)", padding: "10px 16px", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px", zIndex: 100 }}>
          <CheckIcon size={16} />복사되었습니다
        </div>
      )}
    </div>
  );
}
