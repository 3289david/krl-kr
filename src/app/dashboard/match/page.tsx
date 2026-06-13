"use client";
import { useState, useEffect } from "react";

interface Listing { id: string; type: string; title: string; description?: string; category: string; contact?: string; status: string; created_at: number; }

function relTime(ts: number) { const n = Number(ts); const d = Date.now()-n; if(d<86400000) return `${Math.floor(d/3600000) || 1}시간 전`; return new Date(n).toLocaleDateString("ko-KR"); }
const CATS = ["전자기기", "의류/잡화", "도서/문구", "스포츠/레저", "가구/생활", "식품/음료", "반려동물", "기타"];
const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-canvas)", color: "var(--color-ink)", boxSizing: "border-box" as const };

export default function MatchDashboard() {
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [browse, setBrowse] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ type: "have", title: "", description: "", category: CATS[0], contact: "" });
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterCat, setFilterCat] = useState("");

  useEffect(() => {
    fetch("/api/v1/match?mine=1").then(r => r.json()).then(d => { setMyListings(d.listings ?? []); setLoading(false); });
    loadBrowse();
  }, []);

  useEffect(() => { loadBrowse(); }, [filterType, filterCat]);

  async function loadBrowse() {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterCat) params.set("category", filterCat);
    const r = await fetch(`/api/v1/match?${params}`);
    const d = await r.json();
    setBrowse(d.listings ?? []);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const r = await fetch("/api/v1/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await r.json();
    if (d.listing) { setMyListings(prev => [d.listing, ...prev]); setCreating(false); setForm({ type: "have", title: "", description: "", category: CATS[0], contact: "" }); loadBrowse(); }
    setSaving(false);
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/v1/match/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setMyListings(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    loadBrowse();
  }

  async function del(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/match/${id}`, { method: "DELETE" });
    setMyListings(prev => prev.filter(l => l.id !== id));
    loadBrowse();
  }

  const typeColor = (t: string) => t === "have" ? "#2563eb" : "#dc2626";
  const typeLabel = (t: string) => t === "have" ? "있음" : "필요";
  const statusLabel = (s: string) => ({ active: "활성", matched: "매칭됨", closed: "마감" }[s] ?? s);

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 2 }}>KRL Match</h1>
          <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>물건 있는 사람 ↔ 필요한 사람 자동 연결</p>
        </div>
        <button onClick={() => setCreating(true)} style={{ padding: "8px 18px", background: "var(--color-ink)", color: "var(--color-canvas)", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".875rem" }}>등록</button>
      </div>

      {creating && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={e => e.target === e.currentTarget && setCreating(false)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ fontWeight: 700, marginBottom: 18 }}>새 등록</h2>
            <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 6 }}>유형 *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[["have", "보유 중 (남는 것)"], ["need", "필요 (구하는 것)"]].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setForm(p => ({ ...p, type: v }))} style={{ padding: "10px", border: `2px solid ${form.type === v ? typeColor(v) : "var(--color-hairline)"}`, borderRadius: 8, background: form.type === v ? `${typeColor(v)}10` : "transparent", cursor: "pointer", fontWeight: form.type === v ? 600 : 400, fontSize: ".875rem", color: form.type === v ? typeColor(v) : "var(--color-body)" }}>{l}</button>
                  ))}
                </div>
              </div>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>제목 *</label><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="Dell 65W USB-C 충전기" style={inputStyle} /></div>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>카테고리 *</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>설명</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical" }} /></div>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>연락처 (선택)</label><input value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} placeholder="오픈 카카오톡 링크, 이메일 등" style={inputStyle} /></div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setCreating(false)} style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer" }}>취소</button>
                <button type="submit" disabled={saving} style={{ padding: "8px 20px", background: "var(--color-ink)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "등록 중..." : "등록"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid var(--color-hairline)" }}>
        {[["browse", "전체 목록"], ["mine", "내 등록"]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v as "browse" | "mine")} style={{ padding: "8px 18px", border: "none", background: "transparent", cursor: "pointer", fontSize: ".875rem", fontWeight: tab === v ? 600 : 400, color: tab === v ? "var(--color-ink)" : "var(--color-muted)", borderBottom: tab === v ? "2px solid var(--color-ink)" : "2px solid transparent", marginBottom: -1 }}>{l}</button>
        ))}
      </div>

      {tab === "browse" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: "6px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "var(--color-canvas)", color: "var(--color-ink)", fontSize: ".875rem" }}>
              <option value="">유형 전체</option>
              <option value="have">보유 중</option>
              <option value="need">필요</option>
            </select>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: "6px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "var(--color-canvas)", color: "var(--color-ink)", fontSize: ".875rem" }}>
              <option value="">카테고리 전체</option>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {browse.map(l => (
              <div key={l.id} style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: ".75rem", padding: "2px 10px", borderRadius: 99, background: `${typeColor(l.type)}15`, color: typeColor(l.type), fontWeight: 700 }}>{typeLabel(l.type)}</span>
                  <span style={{ fontSize: ".75rem", color: "var(--color-muted)" }}>{l.category}</span>
                  <span style={{ fontSize: ".75rem", color: "var(--color-muted)", marginLeft: "auto" }}>{relTime(l.created_at)}</span>
                </div>
                <p style={{ fontWeight: 600, fontSize: ".9375rem", marginBottom: 4 }}>{l.title}</p>
                {l.description && <p style={{ fontSize: ".8125rem", color: "var(--color-body)", lineHeight: 1.5 }}>{l.description}</p>}
                {l.contact && <a href={l.contact.startsWith("http") ? l.contact : `mailto:${l.contact}`} target="_blank" rel="noopener" style={{ display: "inline-block", marginTop: 10, fontSize: ".8125rem", color: "#2563eb", textDecoration: "none" }}>연락하기</a>}
              </div>
            ))}
            {browse.length === 0 && <p style={{ color: "var(--color-muted)", fontSize: ".875rem", gridColumn: "1/-1", textAlign: "center", padding: 40 }}>등록된 물건이 없습니다.</p>}
          </div>
        </>
      )}

      {tab === "mine" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>불러오는 중...</p> : myListings.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, border: "2px dashed var(--color-hairline)", borderRadius: 12 }}>
              <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>등록한 물건이 없습니다.</p>
            </div>
          ) : myListings.map(l => (
            <div key={l.id} style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: ".75rem", padding: "2px 10px", borderRadius: 99, background: `${typeColor(l.type)}15`, color: typeColor(l.type), fontWeight: 700, flexShrink: 0 }}>{typeLabel(l.type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600 }}>{l.title}</p>
                <p style={{ fontSize: ".8125rem", color: "var(--color-muted)" }}>{l.category} · {relTime(l.created_at)}</p>
              </div>
              <span style={{ fontSize: ".75rem", padding: "2px 8px", borderRadius: 99, background: l.status === "active" ? "#dcfce7" : "#f1f5f9", color: l.status === "active" ? "#166534" : "#64748b", fontWeight: 600 }}>{statusLabel(l.status)}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {l.status === "active" && <button onClick={() => updateStatus(l.id, "matched")} style={{ padding: "4px 10px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: ".75rem" }}>매칭완료</button>}
                {l.status === "active" && <button onClick={() => updateStatus(l.id, "closed")} style={{ padding: "4px 10px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: ".75rem" }}>마감</button>}
                <button onClick={() => del(l.id)} style={{ padding: "4px 8px", border: "1px solid #fecdd3", borderRadius: 6, background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: ".75rem" }}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
