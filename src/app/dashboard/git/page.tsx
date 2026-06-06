"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ShareButton } from "@/components/share-button";

interface Repo { id: string; name: string; description: string; is_public: boolean; updated_at: number; share_token?: string | null; }

function fmtDate(ts: number | string | null | undefined): string {
  if (!ts) return "";
  return new Date(Number(ts)).toLocaleDateString("ko-KR");
}

export default function GitPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newRepo, setNewRepo] = useState({ name: "", description: "", is_public: false });

  useEffect(() => {
    fetch("/api/v1/git").then(r => r.json()).then(d => {
      if (d.repos) setRepos(d.repos);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function createRepo() {
    if (!newRepo.name.trim()) return;
    const r = await fetch("/api/v1/git", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRepo),
    });
    const d = await r.json();
    if (d.repo) { setRepos(prev => [d.repo, ...prev]); setShowNew(false); setNewRepo({ name: "", description: "", is_public: false }); }
  }

  async function deleteRepo(id: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm("저장소를 삭제하시겠습니까?")) return;
    await fetch(`/api/v1/git/${id}`, { method: "DELETE" });
    setRepos(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div style={{ padding: "32px", maxWidth: "900px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "4px" }}>KRL Git</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>코드 저장소</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ padding: "8px 20px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.9375rem", fontWeight: 600 }}>+ 새 저장소</button>
      </div>

      {showNew && (
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input value={newRepo.name} onChange={e => setNewRepo(p => ({ ...p, name: e.target.value }))} placeholder="저장소 이름" style={{ padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", fontSize: "0.9375rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <input value={newRepo.description} onChange={e => setNewRepo(p => ({ ...p, description: e.target.value }))} placeholder="설명 (선택)" style={{ padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.875rem" }}>
              <input type="checkbox" checked={newRepo.is_public} onChange={e => setNewRepo(p => ({ ...p, is_public: e.target.checked }))} />
              공개 저장소
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={createRepo} style={{ padding: "8px 16px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>만들기</button>
              <button onClick={() => setShowNew(false)} style={{ padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", background: "var(--color-surface)", cursor: "pointer" }}>취소</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: "var(--color-muted)" }}>로딩 중...</div> : repos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--color-muted)" }}>저장소가 없습니다.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {repos.map(repo => (
            <Link key={repo.id} href={`/dashboard/git/${repo.id}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: "12px", transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--color-accent)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-hairline)")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" style={{ color: "var(--color-muted)", flexShrink: 0, marginTop: "2px" }}><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9V5.25M18 15v-2.25M6 9v6"/></svg>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 700, color: "var(--color-ink)", fontSize: "0.9375rem" }}>{repo.name}</span>
                    <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "99px", background: repo.is_public ? "#10b98120" : "#6b728020", color: repo.is_public ? "#10b981" : "#6b7280", fontWeight: 600 }}>
                      {repo.is_public ? "공개" : "비공개"}
                    </span>
                  </div>
                  {repo.description && <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{repo.description}</p>}
                  <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "4px" }}>업데이트: {fmtDate(repo.updated_at)}</p>
                </div>
                <div onClick={e => e.preventDefault()} style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <button onClick={e => deleteRepo(repo.id, e)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "4px" }}>✕</button>
                  <ShareButton type="git" id={Number(repo.id)} initialPublic={repo.is_public} initialToken={repo.share_token} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
