"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Entry { id: string; author_name: string; content: string; created_at: number; }
interface Guestbook { slug: string; name: string; description?: string; allow_anonymous: number; require_approval: number; theme: string; entry_count: number; }

function relTime(ts: number) { const d = Date.now()-ts; if(d<60000) return "방금"; if(d<3600000) return `${Math.floor(d/60000)}분 전`; if(d<86400000) return `${Math.floor(d/3600000)}시간 전`; return new Date(ts).toLocaleDateString("ko-KR"); }

export default function GuestbookPage() {
  const { slug } = useParams() as { slug: string };
  const [gb, setGb] = useState<Guestbook | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  function loadEntries(p: number, append = false) {
    fetch(`/api/v1/guestbook/${slug}/entries?page=${p}`)
      .then(r => r.json())
      .then(d => { if(d.entries) { setEntries(prev => append ? [...prev, ...d.entries] : d.entries); setTotal(d.total ?? 0); } });
  }

  useEffect(() => {
    fetch(`/api/v1/guestbook/${slug}`)
      .then(r => r.json())
      .then(d => { if(d.guestbook) setGb(d.guestbook); setLoading(false); });
    loadEntries(1);
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg("");
    try {
      const r = await fetch(`/api/v1/guestbook/${slug}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author_name: name, content }),
      });
      const d = await r.json();
      if (d.ok) {
        setContent(""); setName("");
        if (!d.pending) { setMsg("등록되었습니다!"); setPage(1); loadEntries(1); }
        else setMsg("관리자 승인 후 표시됩니다.");
      } else setMsg(d.error ?? "오류");
    } catch { setMsg("네트워크 오류"); }
    setSubmitting(false);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const isDark = gb?.theme === "dark";
  const bg = isDark ? "#0f172a" : "#f8fafc";
  const cardBg = isDark ? "#1e293b" : "#ffffff";
  const border = isDark ? "#334155" : "#e2e8f0";
  const ink = isDark ? "#f1f5f9" : "#0f172a";
  const muted = isDark ? "#94a3b8" : "#64748b";

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "system-ui,sans-serif", padding: "clamp(16px,4vw,48px)" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: "clamp(1.5rem,4vw,2rem)", fontWeight: 800, color: ink, marginBottom: 6 }}>{gb?.name ?? slug}</h1>
          {gb?.description && <p style={{ color: muted, lineHeight: 1.6 }}>{gb.description}</p>}
          <p style={{ color: muted, fontSize: ".8125rem", marginTop: 8 }}>{total.toLocaleString()}개의 방명록</p>
        </div>

        {/* Write form */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: "clamp(16px,4vw,24px)", marginBottom: 32 }}>
          <h2 style={{ fontWeight: 700, fontSize: "1rem", color: ink, marginBottom: 16 }}>방명록 남기기</h2>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {gb?.allow_anonymous ? (
              <input value={name} onChange={e => setName(e.target.value)} placeholder="이름 (비워두면 익명)" style={{ padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 8, fontSize: ".875rem", background: isDark ? "#0f172a" : "#f8fafc", color: ink, fontFamily: "inherit", outline: "none" }} />
            ) : (
              <input value={name} onChange={e => setName(e.target.value)} placeholder="이름 *" required style={{ padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 8, fontSize: ".875rem", background: isDark ? "#0f172a" : "#f8fafc", color: ink, fontFamily: "inherit", outline: "none" }} />
            )}
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="방명록 내용 *" required rows={3} maxLength={500} style={{ padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 8, fontSize: ".875rem", background: isDark ? "#0f172a" : "#f8fafc", color: ink, fontFamily: "inherit", outline: "none", resize: "vertical" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: ".75rem", color: muted }}>{content.length}/500</span>
              <button type="submit" disabled={submitting} style={{ padding: "8px 20px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: ".875rem" }}>
                {submitting ? "등록 중..." : "등록"}
              </button>
            </div>
            {msg && <p style={{ fontSize: ".8125rem", color: msg.includes("오류") || msg.includes("error") ? "#ef4444" : "#10b981" }}>{msg}</p>}
          </form>
        </div>

        {/* Entries */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {entries.length === 0 && <p style={{ color: muted, textAlign: "center", padding: "48px 0" }}>아직 방명록이 없습니다. 첫 번째로 남겨보세요!</p>}
          {entries.map(e => (
            <div key={e.id} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <img src={`/api/v1/avatar/${encodeURIComponent(e.author_name)}?size=32`} alt="" width={32} height={32} style={{ borderRadius: "50%" }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: ".875rem", color: ink }}>{e.author_name}</p>
                  <p style={{ fontSize: ".75rem", color: muted }}>{relTime(e.created_at)}</p>
                </div>
              </div>
              <p style={{ color: ink, lineHeight: 1.6, fontSize: ".9375rem" }}>{e.content}</p>
            </div>
          ))}
        </div>

        {entries.length < total && (
          <button onClick={() => { const next = page + 1; setPage(next); loadEntries(next, true); }}
            style={{ marginTop: 20, width: "100%", padding: "12px", border: `1px solid ${border}`, borderRadius: 10, background: "transparent", color: muted, cursor: "pointer", fontSize: ".875rem" }}>
            더 보기
          </button>
        )}

        <div style={{ marginTop: 40, textAlign: "center" }}>
          <a href="https://krl.kr" style={{ color: muted, fontSize: ".75rem", textDecoration: "none" }}>KRL Guestbook으로 만들어진 방명록</a>
        </div>
      </div>
    </div>
  );
}
