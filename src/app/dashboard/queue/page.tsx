"use client";
import { useState, useEffect, useCallback } from "react";

interface Queue { id: string; slug: string; name: string; description?: string; max_size: number; is_active: number; view_count: number; waiting_count: number; }
interface Entry { id: string; name: string; phone?: string; ticket_number: number; status: string; note?: string; joined_at: number; called_at?: number; }

function relTime(ts: number) { const n = Number(ts); const d = Date.now()-n; if(d<60000) return "방금"; if(d<3600000) return `${Math.floor(d/60000)}분 전`; if(d<86400000) return `${Math.floor(d/3600000)}시간 전`; return new Date(n).toLocaleDateString("ko-KR"); }
function statusLabel(s: string) { return { waiting: "대기중", called: "호출됨", done: "완료", cancelled: "취소" }[s] ?? s; }
function statusColor(s: string) { return { waiting: "#3b82f6", called: "#f59e0b", done: "#10b981", cancelled: "#6b7280" }[s] ?? "#6b7280"; }

const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-canvas)", color: "var(--color-ink)", boxSizing: "border-box" as const };

export default function QueueDashboard() {
  const [list, setList] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", max_size: "" });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Queue | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch("/api/v1/queue").then(r => r.json()).then(d => { setList(d.queues ?? []); setLoading(false); });
  }, []);

  const loadEntries = useCallback(async (q: Queue) => {
    setEntriesLoading(true);
    const r = await fetch(`/api/v1/queue/${q.slug}`);
    const d = await r.json();
    setEntries(d.entries ?? []);
    setEntriesLoading(false);
  }, []);

  useEffect(() => {
    if (!selected) return;
    loadEntries(selected);
    const iv = setInterval(() => loadEntries(selected), 5000);
    return () => clearInterval(iv);
  }, [selected, loadEntries]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const r = await fetch("/api/v1/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, description: form.description || undefined, max_size: form.max_size ? Number(form.max_size) : 0 }) });
    const d = await r.json();
    if (d.queue) { setList(prev => [d.queue, ...prev]); setCreating(false); setForm({ name: "", description: "", max_size: "" }); }
    setSaving(false);
  }

  async function del(q: Queue) {
    if (!confirm(`"${q.name}" 대기열을 삭제하시겠습니까?`)) return;
    await fetch(`/api/v1/queue/${q.slug}`, { method: "DELETE" });
    setList(prev => prev.filter(x => x.id !== q.id));
    if (selected?.id === q.id) { setSelected(null); setEntries([]); }
  }

  async function toggleActive(q: Queue) {
    await fetch(`/api/v1/queue/${q.slug}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: q.is_active ? 0 : 1 }) });
    setList(prev => prev.map(x => x.id === q.id ? { ...x, is_active: x.is_active ? 0 : 1 } : x));
    if (selected?.id === q.id) setSelected(prev => prev ? { ...prev, is_active: prev.is_active ? 0 : 1 } : null);
  }

  async function updateEntry(entryId: string, status: string) {
    if (!selected) return;
    await fetch(`/api/v1/queue/${selected.slug}/entry/${entryId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status, called_at: status === "called" ? Date.now() : e.called_at } : e));
    setList(prev => prev.map(x => x.id === selected.id ? { ...x, waiting_count: x.waiting_count + (status === "waiting" ? 1 : -1) } : x));
  }

  async function delEntry(entryId: string) {
    if (!selected) return;
    await fetch(`/api/v1/queue/${selected.slug}/entry/${entryId}`, { method: "DELETE" });
    setEntries(prev => prev.filter(e => e.id !== entryId));
  }

  function copyLink(slug: string) { navigator.clipboard.writeText(`https://krl.kr/queue/${slug}`); setCopied(slug); setTimeout(() => setCopied(""), 2000); }

  const waiting = entries.filter(e => e.status === "waiting");
  const called = entries.filter(e => e.status === "called");
  const done = entries.filter(e => e.status !== "waiting" && e.status !== "called");

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 2 }}>KRL Queue</h1>
          <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>QR 코드로 대기열 관리</p>
        </div>
        <button onClick={() => setCreating(true)} style={{ padding: "8px 18px", background: "var(--color-ink)", color: "var(--color-canvas)", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".875rem" }}>새 대기열</button>
      </div>

      {creating && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={e => e.target === e.currentTarget && setCreating(false)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ fontWeight: 700, marginBottom: 18 }}>새 대기열 만들기</h2>
            <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>이름 *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="급식 대기열" style={inputStyle} /></div>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>설명</label><input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="학교 급식실 대기열" style={inputStyle} /></div>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>최대 인원 (0 = 무제한)</label><input type="number" min="0" value={form.max_size} onChange={e => setForm(p => ({ ...p, max_size: e.target.value }))} placeholder="0" style={inputStyle} /></div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button type="button" onClick={() => setCreating(false)} style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer" }}>취소</button>
                <button type="submit" disabled={saving} style={{ padding: "8px 20px", background: "var(--color-ink)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "생성 중..." : "생성"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>불러오는 중...</p> : list.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", border: "2px dashed var(--color-hairline)", borderRadius: 12 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={1.5} style={{ marginBottom: 10 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/></svg>
              <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>대기열이 없습니다</p>
            </div>
          ) : list.map(q => (
            <div key={q.id} onClick={() => setSelected(q)} style={{ padding: "12px 14px", border: `2px solid ${selected?.id === q.id ? "var(--color-ink)" : "var(--color-hairline)"}`, borderRadius: 10, cursor: "pointer", background: selected?.id === q.id ? "var(--color-canvas)" : "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: ".9375rem", flex: 1 }}>{q.name}</span>
                <span style={{ fontSize: ".75rem", padding: "2px 8px", borderRadius: 99, background: q.is_active ? "#dcfce7" : "#f1f5f9", color: q.is_active ? "#166534" : "#64748b", fontWeight: 600 }}>{q.is_active ? "운영중" : "중지"}</span>
              </div>
              {q.description && <p style={{ fontSize: ".8125rem", color: "var(--color-muted)", marginBottom: 6 }}>{q.description}</p>}
              <div style={{ display: "flex", gap: 10, fontSize: ".75rem", color: "var(--color-muted)" }}>
                <span>대기 {Number(q.waiting_count)}명</span>
                <span>조회 {Number(q.view_count)}</span>
                {Number(q.max_size) > 0 && <span>최대 {Number(q.max_size)}명</span>}
              </div>
            </div>
          ))}
        </div>

        {selected ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
              <h2 style={{ fontWeight: 700, fontSize: "1.125rem", flex: 1 }}>{selected.name}</h2>
              <button onClick={() => copyLink(selected.slug)} style={{ padding: "6px 14px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: copied === selected.slug ? "#10b981" : "transparent", color: copied === selected.slug ? "#fff" : "var(--color-body)", cursor: "pointer", fontSize: ".8125rem" }}>{copied === selected.slug ? "복사됨" : "링크 복사"}</button>
              <a href={`/dashboard/qr?url=${encodeURIComponent(`https://krl.kr/queue/${selected.slug}`)}`} target="_blank" rel="noopener" style={{ padding: "6px 14px", border: "1px solid var(--color-hairline)", borderRadius: 8, color: "var(--color-body)", textDecoration: "none", fontSize: ".8125rem" }}>QR 코드</a>
              <button onClick={() => toggleActive(selected)} style={{ padding: "6px 14px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: ".8125rem", color: selected.is_active ? "#dc2626" : "#16a34a" }}>{selected.is_active ? "중지" : "활성화"}</button>
              <button onClick={() => del(selected)} style={{ padding: "6px 12px", border: "1px solid #fecdd3", borderRadius: 8, background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: ".8125rem" }}>삭제</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              {[["대기중", waiting.length, "#3b82f6"], ["호출됨", called.length, "#f59e0b"], ["완료/취소", done.length, "#10b981"]].map(([label, count, color]) => (
                <div key={label as string} style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 10, padding: "14px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.75rem", fontWeight: 700, color: color as string }}>{count as number}</div>
                  <div style={{ fontSize: ".8125rem", color: "var(--color-muted)" }}>{label}</div>
                </div>
              ))}
            </div>

            {entriesLoading && entries.length === 0 ? <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>불러오는 중...</p> : entries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", border: "2px dashed var(--color-hairline)", borderRadius: 12 }}>
                <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>아직 대기자가 없습니다</p>
                <p style={{ color: "var(--color-muted)", fontSize: ".8125rem", marginTop: 8 }}>QR 코드로 링크를 공유하세요: krl.kr/queue/{selected.slug}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {entries.map(e => (
                  <div key={e.id} style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: statusColor(e.status), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: ".875rem", flexShrink: 0 }}>#{e.ticket_number}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: ".9375rem" }}>{e.name}</div>
                      {e.phone && <div style={{ fontSize: ".8125rem", color: "var(--color-muted)" }}>{e.phone}</div>}
                      {e.note && <div style={{ fontSize: ".8125rem", color: "var(--color-muted)" }}>{e.note}</div>}
                      <div style={{ fontSize: ".75rem", color: "var(--color-muted)", marginTop: 2 }}>{relTime(e.joined_at)}</div>
                    </div>
                    <span style={{ fontSize: ".75rem", padding: "3px 10px", borderRadius: 99, background: `${statusColor(e.status)}20`, color: statusColor(e.status), fontWeight: 600 }}>{statusLabel(e.status)}</span>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {e.status === "waiting" && <button onClick={() => updateEntry(e.id, "called")} style={{ padding: "4px 10px", border: "none", borderRadius: 6, background: "#f59e0b", color: "#fff", cursor: "pointer", fontSize: ".75rem", fontWeight: 600 }}>호출</button>}
                      {e.status === "called" && <button onClick={() => updateEntry(e.id, "done")} style={{ padding: "4px 10px", border: "none", borderRadius: 6, background: "#10b981", color: "#fff", cursor: "pointer", fontSize: ".75rem", fontWeight: 600 }}>완료</button>}
                      {(e.status === "waiting" || e.status === "called") && <button onClick={() => updateEntry(e.id, "cancelled")} style={{ padding: "4px 8px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: ".75rem", color: "var(--color-muted)" }}>취소</button>}
                      <button onClick={() => delEntry(e.id)} style={{ padding: "4px 8px", border: "1px solid #fecdd3", borderRadius: 6, background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: ".75rem" }}>삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, border: "2px dashed var(--color-hairline)", borderRadius: 14 }}>
            <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>왼쪽에서 대기열을 선택하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
