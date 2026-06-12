"use client";
import { useState, useEffect } from "react";

interface Project { id: string; slug: string; name: string; tagline?: string; status: string; accent_color: string; website_url?: string; github_url?: string; }
interface ChangelogEntry { id: string; version?: string; title: string; content: string; created_at: number; }

const STATUS_MAP: Record<string, string> = { building: "개발 중", beta: "베타", live: "정식 출시", archived: "아카이브" };

export default function LaunchpadDashboard() {
  const [list, setList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [form, setForm] = useState({ name: "", tagline: "", description: "", status: "building", website_url: "", github_url: "", twitter_url: "", logo_text: "", accent_color: "#6366f1", contact_email: "" });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [clForm, setClForm] = useState({ version: "", title: "", content: "" });
  const [clSaving, setClSaving] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch("/api/v1/launchpad").then(r => r.json()).then(d => { setList(d.projects ?? []); setLoading(false); });
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
    const r = await fetch("/api/v1/launchpad", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (d.project) { setList(prev => [d.project, ...prev]); setView("list"); setForm({ name: "", tagline: "", description: "", status: "building", website_url: "", github_url: "", twitter_url: "", logo_text: "", accent_color: "#6366f1", contact_email: "" }); }
    setSaving(false);
  }

  async function del(slug: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/launchpad/${slug}`, { method: "DELETE" });
    setList(prev => prev.filter(p => p.slug !== slug));
    if (selected?.slug === slug) { setSelected(null); setView("list"); }
  }

  async function openDetail(p: Project) {
    setSelected(p);
    const r = await fetch(`/api/v1/launchpad/${p.slug}/changelog`);
    const d = await r.json();
    setChangelog(d.changelog ?? []);
    setView("detail");
  }

  async function addChangelog(e: React.FormEvent) {
    e.preventDefault(); if (!selected) return; setClSaving(true);
    const r = await fetch(`/api/v1/launchpad/${selected.slug}/changelog`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clForm) });
    const d = await r.json();
    if (d.entry) { setChangelog(prev => [d.entry, ...prev]); setClForm({ version: "", title: "", content: "" }); }
    setClSaving(false);
  }

  async function delChangelog(entryId: string) {
    if (!selected) return;
    await fetch(`/api/v1/launchpad/${selected.slug}/changelog?id=${entryId}`, { method: "DELETE" });
    setChangelog(prev => prev.filter(c => c.id !== entryId));
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`https://krl.kr/launchpad/${slug}`);
    setCopied(slug); setTimeout(() => setCopied(""), 2000);
  }

  if (view === "create") return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 700 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => setView("list")} style={{ padding: "6px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: ".875rem", color: "var(--color-body)" }}>← 뒤로</button>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>새 프로젝트</h1>
      </div>
      <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>프로젝트 이름 *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="MyApp" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>상태</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }}>
              <option value="building">개발 중</option>
              <option value="beta">베타</option>
              <option value="live">정식 출시</option>
              <option value="archived">아카이브</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>로고 텍스트 (선택)</label>
            <input value={form.logo_text} onChange={e => setForm(p => ({ ...p, logo_text: e.target.value }))} placeholder="MA" maxLength={3} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>강조 색상</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={form.accent_color} onChange={e => setForm(p => ({ ...p, accent_color: e.target.value }))} style={{ width: 40, height: 36, padding: 0, border: "1px solid var(--color-hairline)", borderRadius: 6, cursor: "pointer" }} />
              <input value={form.accent_color} onChange={e => setForm(p => ({ ...p, accent_color: e.target.value }))} style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
            </div>
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>한 줄 설명 (선택)</label>
          <input value={form.tagline} onChange={e => setForm(p => ({ ...p, tagline: e.target.value }))} placeholder="더 나은 방법으로 일하세요" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>상세 설명 (선택)</label>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box", resize: "vertical" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>웹사이트 URL (선택)</label>
            <input type="url" value={form.website_url} onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))} placeholder="https://" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>GitHub URL (선택)</label>
            <input type="url" value={form.github_url} onChange={e => setForm(p => ({ ...p, github_url: e.target.value }))} placeholder="https://github.com/" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>문의 이메일 (선택)</label>
            <input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={() => setView("list")} style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: ".875rem" }}>취소</button>
          <button type="submit" disabled={saving} style={{ padding: "8px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".875rem" }}>{saving ? "생성 중..." : "생성"}</button>
        </div>
      </form>
    </div>
  );

  if (view === "detail" && selected) return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <button onClick={() => setView("list")} style={{ padding: "6px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: ".875rem", color: "var(--color-body)" }}>← 뒤로</button>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: selected.accent_color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: ".875rem" }}>
          {selected.name.slice(0, 1).toUpperCase()}
        </div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, flex: 1 }}>{selected.name}</h1>
        <span style={{ fontSize: ".8125rem", padding: "3px 10px", borderRadius: 99, background: "var(--color-lifted)", color: "var(--color-muted)" }}>{STATUS_MAP[selected.status] ?? selected.status}</span>
        <button onClick={() => copyLink(selected.slug)} style={{ padding: "6px 14px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: copied === selected.slug ? "#10b981" : "transparent", color: copied === selected.slug ? "#fff" : "var(--color-body)", cursor: "pointer", fontSize: ".875rem" }}>{copied === selected.slug ? "복사됨" : "링크 복사"}</button>
        <a href={`/launchpad/${selected.slug}`} target="_blank" rel="noopener" style={{ padding: "6px 14px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", color: "var(--color-body)", textDecoration: "none", fontSize: ".875rem" }}>페이지 보기</a>
        <button onClick={() => del(selected.slug)} style={{ padding: "6px 12px", border: "1px solid #fecdd3", borderRadius: 8, background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: ".875rem" }}>삭제</button>
      </div>

      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: 14, padding: "clamp(16px,4vw,24px)", marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 14 }}>업데이트 추가</h2>
        <form onSubmit={addChangelog} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>버전 (선택)</label>
              <input value={clForm.version} onChange={e => setClForm(p => ({ ...p, version: e.target.value }))} placeholder="v1.2.0" style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>제목 *</label>
              <input value={clForm.title} onChange={e => setClForm(p => ({ ...p, title: e.target.value }))} required placeholder="다크 모드 지원 추가" style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>내용 *</label>
            <textarea value={clForm.content} onChange={e => setClForm(p => ({ ...p, content: e.target.value }))} required rows={3} placeholder="이번 업데이트에서..." style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box", resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={clSaving} style={{ padding: "8px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".875rem" }}>{clSaving ? "추가 중..." : "업데이트 추가"}</button>
          </div>
        </form>
      </div>

      <div>
        <h2 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 14 }}>업데이트 내역 ({changelog.length})</h2>
        {changelog.length === 0 ? (
          <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>업데이트 내역이 없습니다.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {changelog.map(c => (
              <div key={c.id} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    {c.version && <span style={{ fontSize: ".75rem", padding: "2px 8px", background: `${selected.accent_color}20`, color: selected.accent_color, borderRadius: 99, fontWeight: 600 }}>{c.version}</span>}
                    <p style={{ fontWeight: 600, fontSize: ".9375rem", color: "var(--color-ink)" }}>{c.title}</p>
                    <span style={{ fontSize: ".75rem", color: "var(--color-muted)", marginLeft: "auto" }}>{new Date(Number(c.created_at)).toLocaleDateString("ko-KR")}</span>
                  </div>
                  <p style={{ fontSize: ".875rem", color: "var(--color-body)", lineHeight: 1.6, whiteSpace: "pre-line" }}>{c.content}</p>
                </div>
                <button onClick={() => delChangelog(c.id)} style={{ padding: "4px 8px", border: "1px solid #fecdd3", borderRadius: 6, background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: ".75rem", flexShrink: 0 }}>삭제</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 900 }}>
      <style>{`
        @media(max-width:640px){.lp-header{flex-direction:column!important;align-items:flex-start!important;gap:10px!important}.lp-header button{width:100%}}
      `}</style>
      <div className="lp-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>KRL Launchpad</h1>
          <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>사이드 프로젝트 올인원 런치패드</p>
        </div>
        <button onClick={() => setView("create")} style={{ padding: "8px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".9375rem" }}>+ 새 프로젝트</button>
      </div>

      {loading ? <div style={{ color: "var(--color-muted)" }}>로딩 중...</div> : list.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 32px", color: "var(--color-muted)", border: "2px dashed var(--color-hairline)", borderRadius: 16 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>프로젝트가 없습니다.</p>
          <p style={{ fontSize: ".875rem" }}>사이드 프로젝트를 런치패드로 소개하고 피드백을 받아보세요.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
          {list.map(p => (
            <div key={p.id} onClick={() => openDetail(p)} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: 14, padding: "16px", cursor: "pointer", transition: "border-color .15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: p.accent_color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: ".875rem", flexShrink: 0 }}>
                  {p.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: ".9375rem", color: "var(--color-ink)" }}>{p.name}</p>
                  <span style={{ fontSize: ".75rem", color: "var(--color-muted)" }}>{STATUS_MAP[p.status] ?? p.status}</span>
                </div>
              </div>
              {p.tagline && <p style={{ fontSize: ".8125rem", color: "var(--color-muted)", lineHeight: 1.5 }}>{p.tagline}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
