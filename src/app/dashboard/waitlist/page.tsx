"use client";
import { useState, useEffect } from "react";

interface Waitlist { id: string; slug: string; name: string; description?: string; cta: string; referral_enabled: number; is_open: number; goal?: number; signup_count: number; }
interface Signup { id: string; email: string; name?: string; position: number; referral_count: number; created_at: number; }

function relTime(ts: number) { const d = Date.now()-ts; if(d<60000) return "방금"; if(d<3600000) return `${Math.floor(d/60000)}분 전`; if(d<86400000) return `${Math.floor(d/3600000)}시간 전`; return new Date(ts).toLocaleDateString("ko-KR"); }

export default function WaitlistDashboard() {
  const [list, setList] = useState<Waitlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", cta: "사전 등록하기", referral_enabled: true, is_open: true, goal: "" });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Waitlist | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [signupsLoading, setSignupsLoading] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch("/api/v1/waitlist").then(r => r.json()).then(d => { setList(d.waitlists ?? []); setLoading(false); });
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const body: Record<string, unknown> = { ...form, referral_enabled: form.referral_enabled ? 1 : 0, is_open: form.is_open ? 1 : 0 };
    if (form.goal) body.goal = parseInt(form.goal); else delete body.goal;
    const r = await fetch("/api/v1/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (d.waitlist) { setList(prev => [d.waitlist, ...prev]); setCreating(false); setForm({ name: "", description: "", cta: "사전 등록하기", referral_enabled: true, is_open: true, goal: "" }); }
    setSaving(false);
  }

  async function del(slug: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/waitlist/${slug}`, { method: "DELETE" });
    setList(prev => prev.filter(w => w.slug !== slug));
    if (selected?.slug === slug) setSelected(null);
  }

  async function viewSignups(w: Waitlist) {
    setSelected(w); setSignupsLoading(true);
    const r = await fetch(`/api/v1/waitlist/${w.slug}/signup`);
    const d = await r.json();
    setSignups(d.signups ?? []); setSignupsLoading(false);
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`https://krl.kr/waitlist/${slug}`);
    setCopied(slug); setTimeout(() => setCopied(""), 2000);
  }

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 900 }}>
      <style>{`
        @media(max-width:640px){.wl-header{flex-direction:column!important;align-items:flex-start!important;gap:10px!important}.wl-header button{width:100%}.wl-form-grid{grid-template-columns:1fr!important}.wl-actions{flex-wrap:wrap!important}}
      `}</style>
      <div className="wl-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>KRL Waitlist</h1>
          <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>대기자 명단 수집, 이메일 목록, 추천인 시스템</p>
        </div>
        <button onClick={() => setCreating(true)} style={{ padding: "8px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".9375rem" }}>+ 새 웨이트리스트</button>
      </div>

      {creating && (
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: 14, padding: "clamp(16px,4vw,24px)", marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 16 }}>웨이트리스트 만들기</h2>
          <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="wl-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>이름 *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="내 프로젝트 사전 등록" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>버튼 텍스트</label>
                <input value={form.cta} onChange={e => setForm(p => ({ ...p, cta: e.target.value }))} placeholder="사전 등록하기" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>목표 인원 (선택)</label>
                <input type="number" value={form.goal} onChange={e => setForm(p => ({ ...p, goal: e.target.value }))} placeholder="1000" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>설명 (선택)</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="출시 시 가장 먼저 알려드립니다." style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: ".875rem" }}>
                <input type="checkbox" checked={form.referral_enabled} onChange={e => setForm(p => ({ ...p, referral_enabled: e.target.checked }))} /> 추천인 시스템 활성화
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: ".875rem" }}>
                <input type="checkbox" checked={form.is_open} onChange={e => setForm(p => ({ ...p, is_open: e.target.checked }))} /> 등록 오픈
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setCreating(false)} style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: ".875rem" }}>취소</button>
              <button type="submit" disabled={saving} style={{ padding: "8px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".875rem" }}>{saving ? "생성 중..." : "생성"}</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          {loading ? <div style={{ color: "var(--color-muted)" }}>로딩 중...</div> : list.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 32px", color: "var(--color-muted)", border: "2px dashed var(--color-hairline)", borderRadius: 16 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>웨이트리스트가 없습니다.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {list.map(w => (
                <div key={w.id} onClick={() => viewSignups(w)} style={{ background: selected?.id === w.id ? "var(--color-accent)" : "var(--color-lifted)", border: `1px solid ${selected?.id === w.id ? "var(--color-accent)" : "var(--color-hairline)"}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all .15s" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: ".9375rem", color: selected?.id === w.id ? "#fff" : "var(--color-ink)", marginBottom: 2 }}>{w.name}</p>
                      <p style={{ fontSize: ".8125rem", color: selected?.id === w.id ? "rgba(255,255,255,.7)" : "var(--color-muted)" }}>{Number(w.signup_count).toLocaleString()}명 등록 {w.goal ? `/ 목표 ${Number(w.goal).toLocaleString()}명` : ""}</p>
                    </div>
                    <div className="wl-actions" style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => copyLink(w.slug)} style={{ padding: "4px 10px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: copied === w.slug ? "#10b981" : "transparent", color: copied === w.slug ? "#fff" : "var(--color-body)", cursor: "pointer", fontSize: ".75rem" }}>{copied === w.slug ? "복사됨" : "링크"}</button>
                      <a href={`/waitlist/${w.slug}`} target="_blank" rel="noopener" style={{ padding: "4px 10px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: "transparent", color: "var(--color-body)", textDecoration: "none", fontSize: ".75rem" }}>보기</a>
                      <button onClick={() => del(w.slug)} style={{ padding: "4px 10px", border: "1px solid #fecdd3", borderRadius: 6, background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: ".75rem" }}>삭제</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div style={{ flex: 1, minWidth: 280, background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: 14, padding: "16px", maxHeight: 480, overflow: "auto" }}>
            <p style={{ fontWeight: 700, fontSize: ".9375rem", marginBottom: 12 }}>{selected.name} — 신청자 목록</p>
            {signupsLoading ? <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>로딩 중...</p> : signups.length === 0 ? (
              <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>신청자가 없습니다.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {signups.map(s => (
                  <div key={s.id} style={{ padding: "10px 12px", background: "var(--color-surface)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: ".75rem", fontWeight: 700, color: "var(--color-accent)", minWidth: 28 }}>#{s.position}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: ".875rem", fontWeight: 600, color: "var(--color-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</p>
                      {s.name && <p style={{ fontSize: ".75rem", color: "var(--color-muted)" }}>{s.name}</p>}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {s.referral_count > 0 && <p style={{ fontSize: ".75rem", color: "#10b981" }}>추천 {s.referral_count}</p>}
                      <p style={{ fontSize: ".75rem", color: "var(--color-muted)" }}>{relTime(s.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
