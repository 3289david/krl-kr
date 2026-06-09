"use client";
import { useState, useEffect } from "react";

interface Guestbook { id: string; slug: string; name: string; description?: string; allow_anonymous: number; require_approval: number; theme: string; entry_count: number; }
interface Entry { id: string; author_name: string; content: string; is_approved: number; created_at: number; }

function relTime(ts: number) { const d = Date.now()-ts; if(d<60000) return "방금"; if(d<3600000) return `${Math.floor(d/60000)}분 전`; if(d<86400000) return `${Math.floor(d/3600000)}시간 전`; return new Date(ts).toLocaleDateString("ko-KR"); }

export default function GuestbookDashboard() {
  const [list, setList] = useState<Guestbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", allow_anonymous: true, require_approval: false, theme: "light" });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Guestbook | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch("/api/v1/guestbook").then(r => r.json()).then(d => { setList(d.guestbooks ?? []); setLoading(false); });
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const r = await fetch("/api/v1/guestbook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, allow_anonymous: form.allow_anonymous ? 1 : 0, require_approval: form.require_approval ? 1 : 0 }) });
    const d = await r.json();
    if (d.guestbook) { setList(prev => [d.guestbook, ...prev]); setCreating(false); setForm({ name: "", description: "", allow_anonymous: true, require_approval: false, theme: "light" }); }
    setSaving(false);
  }

  async function del(slug: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/guestbook/${slug}`, { method: "DELETE" });
    setList(prev => prev.filter(g => g.slug !== slug));
    if (selected?.slug === slug) setSelected(null);
  }

  async function delEntry(gbSlug: string, entryId: string) {
    await fetch(`/api/v1/guestbook/${gbSlug}/entries?id=${entryId}`, { method: "DELETE" });
    setEntries(prev => prev.filter(e => e.id !== entryId));
    setList(prev => prev.map(g => g.slug === gbSlug ? { ...g, entry_count: Math.max(0, g.entry_count - 1) } : g));
  }

  async function viewEntries(g: Guestbook) {
    setSelected(g); setEntriesLoading(true);
    const r = await fetch(`/api/v1/guestbook/${g.slug}/entries?page=1&all=1`);
    const d = await r.json();
    setEntries(d.entries ?? []); setEntriesLoading(false);
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`https://krl.kr/guestbook/${slug}`);
    setCopied(slug); setTimeout(() => setCopied(""), 2000);
  }

  function copyEmbed(slug: string) {
    navigator.clipboard.writeText(`<script src="https://krl.kr/api/guestbook/embed.js?key=${slug}"><\/script>`);
    setCopied(`embed-${slug}`); setTimeout(() => setCopied(""), 2000);
  }

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 960 }}>
      <style>{`
        @media(max-width:640px){.gb-header{flex-direction:column!important;align-items:flex-start!important;gap:10px!important}.gb-header button{width:100%}.gb-form-grid{grid-template-columns:1fr!important}.gb-actions{flex-wrap:wrap!important}}
      `}</style>
      <div className="gb-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>KRL Guestbook</h1>
          <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>방명록 페이지 및 embed 위젯</p>
        </div>
        <button onClick={() => setCreating(true)} style={{ padding: "8px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".9375rem" }}>+ 새 방명록</button>
      </div>

      {creating && (
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: 14, padding: "clamp(16px,4vw,24px)", marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 16 }}>방명록 만들기</h2>
          <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="gb-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>이름 *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="내 블로그 방명록" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>테마</label>
                <select value={form.theme} onChange={e => setForm(p => ({ ...p, theme: e.target.value }))} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }}>
                  <option value="light">라이트</option>
                  <option value="dark">다크</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>설명 (선택)</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="방문해주셔서 감사합니다!" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: ".875rem" }}>
                <input type="checkbox" checked={form.allow_anonymous} onChange={e => setForm(p => ({ ...p, allow_anonymous: e.target.checked }))} /> 익명 허용
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: ".875rem" }}>
                <input type="checkbox" checked={form.require_approval} onChange={e => setForm(p => ({ ...p, require_approval: e.target.checked }))} /> 승인 후 게시
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
        <div style={{ flex: 1, minWidth: 260 }}>
          {loading ? <div style={{ color: "var(--color-muted)" }}>로딩 중...</div> : list.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 32px", color: "var(--color-muted)", border: "2px dashed var(--color-hairline)", borderRadius: 16 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>방명록이 없습니다.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {list.map(g => (
                <div key={g.id} onClick={() => viewEntries(g)} style={{ background: selected?.id === g.id ? "var(--color-accent)" : "var(--color-lifted)", border: `1px solid ${selected?.id === g.id ? "var(--color-accent)" : "var(--color-hairline)"}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer" }}>
                  <p style={{ fontWeight: 700, fontSize: ".9375rem", color: selected?.id === g.id ? "#fff" : "var(--color-ink)", marginBottom: 4 }}>{g.name}</p>
                  <p style={{ fontSize: ".8125rem", color: selected?.id === g.id ? "rgba(255,255,255,.7)" : "var(--color-muted)", marginBottom: 8 }}>{g.entry_count}개의 방명록</p>
                  <div className="gb-actions" style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => copyLink(g.slug)} style={{ padding: "4px 10px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: copied === g.slug ? "#10b981" : "transparent", color: copied === g.slug ? "#fff" : "var(--color-body)", cursor: "pointer", fontSize: ".75rem" }}>{copied === g.slug ? "복사됨" : "링크"}</button>
                    <button onClick={() => copyEmbed(g.slug)} style={{ padding: "4px 10px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: copied === `embed-${g.slug}` ? "#10b981" : "transparent", color: copied === `embed-${g.slug}` ? "#fff" : "var(--color-body)", cursor: "pointer", fontSize: ".75rem" }}>{copied === `embed-${g.slug}` ? "복사됨" : "Embed"}</button>
                    <a href={`/guestbook/${g.slug}`} target="_blank" rel="noopener" style={{ padding: "4px 10px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: "transparent", color: "var(--color-body)", textDecoration: "none", fontSize: ".75rem" }}>보기</a>
                    <button onClick={() => del(g.slug)} style={{ padding: "4px 10px", border: "1px solid #fecdd3", borderRadius: 6, background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: ".75rem" }}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div style={{ flex: 1.4, minWidth: 280, background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: 14, padding: "16px", maxHeight: 520, overflow: "auto" }}>
            <p style={{ fontWeight: 700, fontSize: ".9375rem", marginBottom: 12 }}>{selected.name} — 방명록</p>
            {entriesLoading ? <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>로딩 중...</p> : entries.length === 0 ? (
              <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>방명록이 없습니다.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {entries.map(e => (
                  <div key={e.id} style={{ padding: "10px 12px", background: "var(--color-surface)", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <img src={`/api/v1/avatar/${encodeURIComponent(e.author_name)}?size=28`} alt="" width={28} height={28} style={{ borderRadius: "50%" }} />
                        <span style={{ fontSize: ".8125rem", fontWeight: 600, color: "var(--color-ink)" }}>{e.author_name}</span>
                        <span style={{ fontSize: ".75rem", color: "var(--color-muted)" }}>{relTime(e.created_at)}</span>
                      </div>
                      <button onClick={() => delEntry(selected.slug, e.id)} style={{ padding: "2px 8px", border: "1px solid #fecdd3", borderRadius: 6, background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: ".75rem" }}>삭제</button>
                    </div>
                    <p style={{ fontSize: ".875rem", color: "var(--color-body)", lineHeight: 1.5 }}>{e.content}</p>
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
