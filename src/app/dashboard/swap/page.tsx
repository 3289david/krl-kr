"use client";
import { useState, useEffect } from "react";

interface Listing { id: string; slug: string; title: string; description?: string; category?: string; want_for: string; image_url?: string; status: string; created_at: number; }
interface ReceivedOffer { id: string; listing_id: string; from_username?: string; offer_title: string; offer_description?: string; status: string; created_at: number; }
interface SentOffer { id: string; listing_id: string; listing_title: string; listing_slug: string; listing_status: string; want_for: string; offer_title: string; offer_description?: string; status: string; created_at: number; }

function relTime(ts: number) { const n = Number(ts); const d = Date.now()-n; if(d<60000) return "방금"; if(d<3600000) return `${Math.floor(d/60000)}분 전`; return new Date(n).toLocaleDateString("ko-KR"); }
const statusLabel = (s: string) => ({ open: "교환 가능", matched: "매칭됨", closed: "마감" }[s] ?? s);
const statusColor = (s: string) => ({ open: "#16a34a", matched: "#2563eb", closed: "#6b7280" }[s] ?? "#6b7280");
const offerStatusLabel = (s: string) => ({ pending: "대기중", accepted: "수락됨", rejected: "거절됨" }[s] ?? s);
const offerStatusColor = (s: string) => ({ pending: "#64748b", accepted: "#16a34a", rejected: "#dc2626" }[s] ?? "#64748b");
const CATS = ["전자기기", "의류", "도서/문구", "스포츠", "가구/인테리어", "식품", "기타"];
const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-canvas)", color: "var(--color-ink)", boxSizing: "border-box" as const };

export default function SwapDashboard() {
  const [tab, setTab] = useState<"mine" | "sent">("mine");
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [sentOffers, setSentOffers] = useState<SentOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "", want_for: "" });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [offers, setOffers] = useState<ReceivedOffer[]>([]);

  useEffect(() => {
    fetch("/api/v1/swap?mine=1").then(r => r.json()).then(d => { setMyListings(d.listings ?? []); setLoading(false); });
    fetch("/api/v1/swap?myoffers=1").then(r => r.json()).then(d => setSentOffers(d.offers ?? []));
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/v1/swap/${selected.id}`).then(r => r.json()).then(d => setOffers(d.offers ?? []));
  }, [selected]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const r = await fetch("/api/v1/swap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await r.json();
    if (d.listing) { setMyListings(prev => [d.listing, ...prev]); setCreating(false); setForm({ title: "", description: "", category: "", want_for: "" }); }
    setSaving(false);
  }

  async function del(id: string) {
    if (!confirm("이 교환 글을 삭제하시겠습니까?")) return;
    await fetch(`/api/v1/swap/${id}`, { method: "DELETE" });
    setMyListings(prev => prev.filter(l => l.id !== id));
    if (selected?.id === id) { setSelected(null); setOffers([]); }
  }

  async function updateStatus(listingId: string, status: string) {
    await fetch(`/api/v1/swap/${listingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setMyListings(prev => prev.map(l => l.id === listingId ? { ...l, status } : l));
    if (selected?.id === listingId) setSelected(prev => prev ? { ...prev, status } : null);
  }

  async function respondOffer(offerId: string, status: "accepted" | "rejected") {
    await fetch(`/api/v1/swap/offer/${offerId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status } : o));
    if (status === "accepted" && selected) { updateStatus(selected.id, "matched"); }
  }

  const tabStyle = (active: boolean) => ({ padding: "8px 18px", border: "none", background: "transparent", cursor: "pointer", fontSize: ".875rem", fontWeight: active ? 600 : 400, color: active ? "var(--color-ink)" : "var(--color-muted)", borderBottom: active ? "2px solid var(--color-ink)" : "2px solid transparent", marginBottom: -1 });

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 2 }}>KRL Swap</h1>
          <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>돈 거래 없는 물건 교환</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/swap" target="_blank" style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: 8, color: "var(--color-body)", textDecoration: "none", fontSize: ".875rem" }}>전체 보기</a>
          <button onClick={() => setCreating(true)} style={{ padding: "8px 18px", background: "var(--color-ink)", color: "var(--color-canvas)", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".875rem" }}>새 교환 글</button>
        </div>
      </div>

      {creating && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={e => e.target === e.currentTarget && setCreating(false)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,.2)", maxHeight: "90vh", overflow: "auto" }}>
            <h2 style={{ fontWeight: 700, marginBottom: 18 }}>새 교환 글</h2>
            <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>교환할 물건 *</label><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="Dell 노트북 충전기" style={inputStyle} /></div>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>설명</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="상태, 스펙 등 자세히 설명해주세요" style={{ ...inputStyle, resize: "vertical" }} /></div>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>카테고리</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                  <option value="">선택</option>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>원하는 교환 물건 *</label><input value={form.want_for} onChange={e => setForm(p => ({ ...p, want_for: e.target.value }))} required placeholder="USB-C 충전기, 키보드, 마우스 등" style={inputStyle} /></div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setCreating(false)} style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer" }}>취소</button>
                <button type="submit" disabled={saving} style={{ padding: "8px 20px", background: "var(--color-ink)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "등록 중..." : "등록"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid var(--color-hairline)" }}>
        <button onClick={() => setTab("mine")} style={tabStyle(tab === "mine")}>내 교환 글 ({myListings.length})</button>
        <button onClick={() => setTab("sent")} style={tabStyle(tab === "sent")}>내가 보낸 제안 ({sentOffers.length})</button>
      </div>

      {tab === "mine" && (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {loading ? <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>불러오는 중...</p> : myListings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", border: "2px dashed var(--color-hairline)", borderRadius: 12 }}>
                <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>교환 글이 없습니다</p>
              </div>
            ) : myListings.map(l => (
              <div key={l.id} onClick={() => setSelected(l)} style={{ padding: "12px 14px", border: `2px solid ${selected?.id === l.id ? "var(--color-ink)" : "var(--color-hairline)"}`, borderRadius: 10, cursor: "pointer", background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, flex: 1, fontSize: ".9375rem" }}>{l.title}</span>
                  <span style={{ fontSize: ".75rem", padding: "2px 8px", borderRadius: 99, background: `${statusColor(l.status)}15`, color: statusColor(l.status), fontWeight: 600 }}>{statusLabel(l.status)}</span>
                </div>
                <p style={{ fontSize: ".8125rem", color: "var(--color-muted)" }}>원하는 것: {l.want_for}</p>
                <p style={{ fontSize: ".75rem", color: "var(--color-muted)", marginTop: 4 }}>{relTime(Number(l.created_at))}</p>
              </div>
            ))}
          </div>

          {selected ? (
            <div style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 14, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: 4 }}>{selected.title}</h2>
                  {selected.description && <p style={{ fontSize: ".875rem", color: "var(--color-body)", lineHeight: 1.6 }}>{selected.description}</p>}
                  <p style={{ fontSize: ".875rem", marginTop: 8 }}>원하는 것: <strong>{selected.want_for}</strong></p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {selected.status === "open" && <button onClick={() => updateStatus(selected.id, "closed")} style={{ padding: "6px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: ".8125rem" }}>마감</button>}
                  {selected.status === "closed" && <button onClick={() => updateStatus(selected.id, "open")} style={{ padding: "6px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: ".8125rem" }}>다시 열기</button>}
                  <button onClick={() => del(selected.id)} style={{ padding: "6px 12px", border: "1px solid #fecdd3", borderRadius: 8, background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: ".8125rem" }}>삭제</button>
                </div>
              </div>

              <h3 style={{ fontWeight: 600, fontSize: ".9375rem", marginBottom: 12 }}>받은 제안 ({offers.length})</h3>
              {offers.length === 0 ? <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>아직 제안이 없습니다.</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {offers.map(o => (
                    <div key={o.id} style={{ border: "1px solid var(--color-hairline)", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{o.offer_title}</div>
                          {o.from_username && <div style={{ fontSize: ".8125rem", color: "var(--color-muted)" }}>@{o.from_username}</div>}
                          {o.offer_description && <div style={{ fontSize: ".875rem", color: "var(--color-body)", marginTop: 4 }}>{o.offer_description}</div>}
                        </div>
                        <span style={{ fontSize: ".75rem", padding: "3px 8px", borderRadius: 99, background: o.status === "accepted" ? "#dcfce7" : o.status === "rejected" ? "#fee2e2" : "#f1f5f9", color: o.status === "accepted" ? "#166534" : o.status === "rejected" ? "#dc2626" : "#64748b", fontWeight: 600 }}>
                          {offerStatusLabel(o.status)}
                        </span>
                      </div>
                      {o.status === "pending" && selected.status === "open" && (
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          <button onClick={() => respondOffer(o.id, "accepted")} style={{ padding: "5px 14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: ".8125rem", fontWeight: 600 }}>수락</button>
                          <button onClick={() => respondOffer(o.id, "rejected")} style={{ padding: "5px 14px", background: "transparent", border: "1px solid #fecdd3", borderRadius: 6, cursor: "pointer", fontSize: ".8125rem", color: "#dc2626" }}>거절</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, border: "2px dashed var(--color-hairline)", borderRadius: 14 }}>
              <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>왼쪽에서 교환 글을 선택하세요</p>
            </div>
          )}
        </div>
      )}

      {tab === "sent" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sentOffers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", border: "2px dashed var(--color-hairline)", borderRadius: 12 }}>
              <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>보낸 제안이 없습니다.</p>
              <a href="/swap" style={{ display: "inline-block", marginTop: 10, color: "#3b82f6", textDecoration: "none", fontSize: ".875rem" }}>교환 글 보러가기</a>
            </div>
          ) : sentOffers.map(o => (
            <div key={o.id} style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: ".8125rem", color: "var(--color-muted)", marginBottom: 4 }}>
                    교환 글: <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>{o.listing_title}</span>
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>내 제안: {o.offer_title}</div>
                  {o.offer_description && <div style={{ fontSize: ".8125rem", color: "var(--color-body)" }}>{o.offer_description}</div>}
                  <div style={{ fontSize: ".75rem", color: "var(--color-muted)", marginTop: 6 }}>
                    상대 원하는 것: {o.want_for} · {relTime(Number(o.created_at))}
                  </div>
                </div>
                <span style={{ fontSize: ".75rem", padding: "3px 10px", borderRadius: 99, background: o.status === "accepted" ? "#dcfce7" : o.status === "rejected" ? "#fee2e2" : "#f1f5f9", color: offerStatusColor(o.status), fontWeight: 600, flexShrink: 0 }}>
                  {offerStatusLabel(o.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
