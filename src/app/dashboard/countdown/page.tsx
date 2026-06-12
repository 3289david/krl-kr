"use client";
import { useState, useEffect } from "react";

interface Countdown { id: string; slug: string; title: string; description?: string; target_at: number; theme: string; is_public: number; view_count: number; }

function fmtDate(ts: number) { return new Date(Number(ts)).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }); }
function daysLeft(ts: number) { const d = Math.ceil((Number(ts) - Date.now()) / 86400000); if (d < 0) return "지남"; if (d === 0) return "오늘"; return `D-${d}`; }

export default function CountdownDashboard() {
  const [list, setList] = useState<Countdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", target_at: "", slug: "", theme: "minimal", is_public: true });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch("/api/v1/countdown").then(r => r.json()).then(d => { setList(d.countdowns ?? []); setLoading(false); });
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const r = await fetch("/api/v1/countdown", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, is_public: form.is_public ? 1 : 0 }) });
    const d = await r.json();
    if (d.countdown) { setList(prev => [d.countdown, ...prev]); setCreating(false); setForm({ title: "", description: "", target_at: "", slug: "", theme: "minimal", is_public: true }); }
    setSaving(false);
  }

  async function del(slug: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/countdown/${slug}`, { method: "DELETE" });
    setList(prev => prev.filter(c => c.slug !== slug));
  }

  function copy(slug: string) {
    navigator.clipboard.writeText(`https://krl.kr/countdown/${slug}`);
    setCopied(slug); setTimeout(() => setCopied(""), 2000);
  }

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 900 }}>
      <style>{`
        @media(max-width:640px){.cd-header{flex-direction:column!important;align-items:flex-start!important;gap:10px!important}.cd-header button{width:100%}.cd-form-grid{grid-template-columns:1fr!important}}
      `}</style>
      <div className="cd-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>KRL 카운트다운</h1>
          <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>시험, 행사, 출시일까지의 카운트다운 페이지</p>
        </div>
        <button onClick={() => setCreating(true)} style={{ padding: "8px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".9375rem" }}>+ 새 카운트다운</button>
      </div>

      {creating && (
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: 14, padding: "clamp(16px,4vw,24px)", marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 16 }}>카운트다운 만들기</h2>
          <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="cd-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>제목 *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="수능 2026" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>목표 날짜 *</label>
                <input type="datetime-local" value={form.target_at} onChange={e => setForm(p => ({ ...p, target_at: e.target.value }))} required style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>슬러그 (선택)</label>
                <input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="suneung-2026" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>테마</label>
                <select value={form.theme} onChange={e => setForm(p => ({ ...p, theme: e.target.value }))} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }}>
                  <option value="minimal">미니멀 (다크)</option>
                  <option value="light">라이트</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>설명 (선택)</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="파이팅!" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: ".875rem" }}>
              <input type="checkbox" checked={form.is_public} onChange={e => setForm(p => ({ ...p, is_public: e.target.checked }))} /> 공개 페이지로 설정
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setCreating(false)} style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: ".875rem" }}>취소</button>
              <button type="submit" disabled={saving} style={{ padding: "8px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".875rem" }}>{saving ? "생성 중..." : "생성"}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div style={{ color: "var(--color-muted)" }}>로딩 중...</div> : list.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 32px", color: "var(--color-muted)", border: "2px dashed var(--color-hairline)", borderRadius: 16 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>카운트다운이 없습니다.</p>
          <p style={{ fontSize: ".875rem" }}>시험일, 행사일, 출시일까지의 카운트다운을 만들어보세요.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map(c => (
            <div key={c.id} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontWeight: 800, fontSize: ".875rem" }}>{daysLeft(c.target_at)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: ".9375rem", color: "var(--color-ink)", marginBottom: 2 }}>{c.title}</p>
                <p style={{ fontSize: ".8125rem", color: "var(--color-muted)" }}>{fmtDate(c.target_at)} · 조회 {c.view_count.toLocaleString()}회</p>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                <button onClick={() => copy(c.slug)} style={{ padding: "5px 12px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: copied === c.slug ? "#10b981" : "transparent", color: copied === c.slug ? "#fff" : "var(--color-body)", cursor: "pointer", fontSize: ".8125rem" }}>{copied === c.slug ? "복사됨" : "링크 복사"}</button>
                <a href={`/countdown/${c.slug}`} target="_blank" rel="noopener" style={{ padding: "5px 12px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: "transparent", color: "var(--color-body)", textDecoration: "none", fontSize: ".8125rem" }}>보기</a>
                <button onClick={() => del(c.slug)} style={{ padding: "5px 12px", border: "1px solid #fecdd3", borderRadius: 6, background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: ".8125rem" }}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
