"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ShareButton } from "@/components/share-button";

interface Whiteboard { id: string; name: string; updated_at: number; thumbnail?: string; is_public?: boolean; share_token?: string | null; }

function fmtDate(ts: number | string | null | undefined): string {
  if (!ts) return "";
  return new Date(Number(ts)).toLocaleDateString("ko-KR");
}

export default function WhiteboardPage() {
  const [boards, setBoards] = useState<Whiteboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/v1/whiteboard").then(r => r.json()).then(d => {
      if (d.whiteboards) setBoards(d.whiteboards);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function createBoard() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/v1/whiteboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName || "새 화이트보드" }),
      });
      const d = await r.json();
      if (d.whiteboard) { window.location.href = `/dashboard/whiteboard/${d.whiteboard.id}`; }
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteBoard(id: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/whiteboard/${id}`, { method: "DELETE" });
    setBoards(prev => prev.filter(b => b.id !== id));
  }

  return (
    <div style={{ padding: "32px", maxWidth: "1000px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "4px" }}>KRL Whiteboard</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>온라인 화이트보드</p>
        </div>
        <button onClick={() => setCreating(true)} style={{ padding: "8px 20px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.9375rem", fontWeight: 600 }}>+ 새 보드</button>
      </div>

      {creating && (
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "16px", marginBottom: "20px", display: "flex", gap: "8px" }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && createBoard()} placeholder="화이트보드 이름" autoFocus style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", fontSize: "0.9375rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
          <button onClick={createBoard} disabled={submitting} style={{ padding: "8px 16px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>{submitting ? "만드는 중..." : "만들기"}</button>
          <button onClick={() => setCreating(false)} style={{ padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", background: "var(--color-surface)", cursor: "pointer" }}>취소</button>
        </div>
      )}

      {loading ? <div style={{ color: "var(--color-muted)" }}>로딩 중...</div> : boards.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--color-muted)" }}>화이트보드가 없습니다.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
          {boards.map(board => (
            <Link key={board.id} href={`/dashboard/whiteboard/${board.id}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", overflow: "hidden", transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--color-accent)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-hairline)")}
              >
                <div style={{ height: "120px", background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-muted)" }}>
                  {board.thumbnail ? <img src={board.thumbnail} alt="thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                  )}
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--color-ink)" }}>{board.name}</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{fmtDate(board.updated_at)}</p>
                    </div>
                    <button onClick={e => deleteBoard(board.id, e)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "4px" }}>✕</button>
                  </div>
                  <div onClick={e => e.preventDefault()}>
                    <ShareButton type="whiteboard" id={Number(board.id)} initialPublic={board.is_public} initialToken={board.share_token} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
