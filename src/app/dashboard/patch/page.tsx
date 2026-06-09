"use client";
import { useState, useEffect } from "react";

interface Patch { id: string; site_key: string; title: string; message?: string; type: string; is_active: number; created_at: number; }

const TYPE_MAP: Record<string, string> = { info: "정보", warning: "경고", error: "오류", success: "성공" };
const TYPE_COLOR: Record<string, string> = { info: "#3b82f6", warning: "#f59e0b", error: "#ef4444", success: "#10b981" };

export default function PatchDashboard() {
  const [list, setList] = useState<Patch[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", type: "info", is_active: true });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch("/api/v1/patch").then(r => r.json()).then(d => { setList(d.patches ?? []); setLoading(false); });
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const r = await fetch("/api/v1/patch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, is_active: form.is_active ? 1 : 0 }) });
    const d = await r.json();
    if (d.patch) { setList(prev => [d.patch, ...prev]); setCreating(false); setForm({ title: "", message: "", type: "info", is_active: true }); }
    setSaving(false);
  }

  async function toggle(p: Patch) {
    const r = await fetch(`/api/v1/patch/${p.site_key}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: p.is_active ? 0 : 1 }) });
    const d = await r.json();
    if (d.patch) setList(prev => prev.map(x => x.id === p.id ? d.patch : x));
  }

  async function del(site_key: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/patch/${site_key}`, { method: "DELETE" });
    setList(prev => prev.filter(p => p.site_key !== site_key));
  }

  function copyEmbed(key: string) {
    navigator.clipboard.writeText(`<script src="https://krl.kr/api/patch/banner.js?key=${key}"><\/script>`);
    setCopied(key); setTimeout(() => setCopied(""), 2000);
  }

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 900 }}>
      <style>{`
        @media(max-width:640px){.patch-header{flex-direction:column!important;align-items:flex-start!important;gap:10px!important}.patch-header button{width:100%}.patch-actions{flex-wrap:wrap!important}}
      `}</style>
      <div className="patch-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>KRL Patch</h1>
          <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>긴급 공지 배너를 embed 코드로 어디서든 표시</p>
        </div>
        <button onClick={() => setCreating(true)} style={{ padding: "8px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".9375rem" }}>+ 새 배너</button>
      </div>

      {creating && (
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: 14, padding: "clamp(16px,4vw,24px)", marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 16 }}>배너 만들기</h2>
          <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>제목 *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="서버 점검 안내" style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>유형</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }}>
                  <option value="info">정보</option>
                  <option value="warning">경고</option>
                  <option value="error">오류</option>
                  <option value="success">성공</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: ".8125rem", fontWeight: 600, marginBottom: 4 }}>메시지 (선택)</label>
              <input value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="자세한 내용..." style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" }} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: ".875rem" }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} /> 즉시 활성화
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setCreating(false)} style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: ".875rem" }}>취소</button>
              <button type="submit" disabled={saving} style={{ padding: "8px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".875rem" }}>{saving ? "생성 중..." : "생성"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Embed guide */}
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
        <p style={{ fontSize: ".8125rem", fontWeight: 600, marginBottom: 6 }}>사용 방법</p>
        <code style={{ fontSize: ".75rem", color: "var(--color-muted)", fontFamily: "monospace", display: "block" }}>{`<script src="https://krl.kr/api/patch/banner.js?key=YOUR_KEY"></script>`}</code>
        <p style={{ fontSize: ".75rem", color: "var(--color-muted)", marginTop: 6 }}>배너가 활성 상태일 때만 페이지 상단에 표시됩니다. 비활성 시 자동으로 숨겨집니다.</p>
      </div>

      {loading ? <div style={{ color: "var(--color-muted)" }}>로딩 중...</div> : list.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 32px", color: "var(--color-muted)", border: "2px dashed var(--color-hairline)", borderRadius: 16 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>배너가 없습니다.</p>
          <p style={{ fontSize: ".875rem" }}>긴급 공지, 점검 안내 등을 embed 코드로 배포하세요.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map(p => (
            <div key={p.id} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.is_active ? "#10b981" : "var(--color-muted)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                  <p style={{ fontWeight: 700, fontSize: ".9375rem", color: "var(--color-ink)" }}>{p.title}</p>
                  <span style={{ fontSize: ".75rem", padding: "2px 8px", borderRadius: 99, background: `${TYPE_COLOR[p.type]}20`, color: TYPE_COLOR[p.type], fontWeight: 600 }}>{TYPE_MAP[p.type]}</span>
                  {!p.is_active && <span style={{ fontSize: ".75rem", color: "var(--color-muted)" }}>비활성</span>}
                </div>
                <p style={{ fontSize: ".8125rem", color: "var(--color-muted)", fontFamily: "monospace" }}>key: {p.site_key}</p>
              </div>
              <div className="patch-actions" style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => toggle(p)} style={{ padding: "5px 12px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: p.is_active ? "#fef3c7" : "transparent", color: p.is_active ? "#92400e" : "var(--color-body)", cursor: "pointer", fontSize: ".8125rem" }}>{p.is_active ? "비활성화" : "활성화"}</button>
                <button onClick={() => copyEmbed(p.site_key)} style={{ padding: "5px 12px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: copied === p.site_key ? "#10b981" : "transparent", color: copied === p.site_key ? "#fff" : "var(--color-body)", cursor: "pointer", fontSize: ".8125rem" }}>{copied === p.site_key ? "복사됨" : "Embed 복사"}</button>
                <button onClick={() => del(p.site_key)} style={{ padding: "5px 12px", border: "1px solid #fecdd3", borderRadius: 6, background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: ".8125rem" }}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
