"use client";
import { useState, useEffect } from "react";

interface Listing { id: string; slug: string; title: string; description?: string; category?: string; want_for: string; status: string; created_at: number; }

function relTime(ts: number) { const n = Number(ts); const d = Date.now()-n; if(d<60000) return "방금"; if(d<3600000) return `${Math.floor(d/60000)}분 전`; return new Date(n).toLocaleDateString("ko-KR"); }
const CATS = ["전자기기", "의류", "도서/문구", "스포츠", "가구/인테리어", "식품", "기타"];

export default function SwapBrowsePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [selected, setSelected] = useState<Listing | null>(null);
  const [offerForm, setOfferForm] = useState({ offer_title: "", offer_description: "" });
  const [offering, setOffering] = useState(false);
  const [offerDone, setOfferDone] = useState(false);
  const [offerError, setOfferError] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    fetch(`/api/v1/swap?${params}`).then(r => r.json()).then(d => { setListings(d.listings ?? []); setLoading(false); });
  }, [category, q]);

  async function makeOffer(e: React.FormEvent) {
    e.preventDefault(); if (!selected) return;
    setOffering(true); setOfferError("");
    const r = await fetch(`/api/v1/swap/${selected.id}/offer`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(offerForm),
    });
    const d = await r.json();
    if (d.error) { setOfferError(d.error); }
    else { setOfferDone(true); }
    setOffering(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "16px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <a href="/" style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b", textDecoration: "none" }}>KRL.KR</a>
          <span style={{ color: "#cbd5e1" }}>/</span>
          <span style={{ fontWeight: 600, color: "#3b82f6" }}>Swap</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <a href="/dashboard/swap" style={{ padding: "6px 14px", background: "#1e293b", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: ".875rem", fontWeight: 600 }}>내 교환 글</a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 6 }}>KRL Swap</h1>
        <p style={{ color: "#64748b", fontSize: ".875rem", marginBottom: 24 }}>돈 거래 없이 물건을 교환하세요</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <form onSubmit={e => { e.preventDefault(); setQ(qInput); }} style={{ display: "flex", flex: 1, minWidth: 200, gap: 6 }}>
            <input value={qInput} onChange={e => setQInput(e.target.value)} placeholder="검색..." style={{ flex: 1, padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: ".875rem", background: "#fff", color: "#1e293b" }} />
            <button type="submit" style={{ padding: "8px 14px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: ".875rem" }}>검색</button>
          </form>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", color: "#1e293b", fontSize: ".875rem" }}>
            <option value="">카테고리 전체</option>
            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {loading ? (
          <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>불러오는 중...</p>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} style={{ marginBottom: 12 }}><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="1"/></svg>
            <p>등록된 교환 글이 없습니다.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {listings.map(l => (
              <div key={l.id} onClick={() => { setSelected(l); setOfferDone(false); setOfferError(""); setOfferForm({ offer_title: "", offer_description: "" }); }} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18, cursor: "pointer", transition: "box-shadow .15s" }} onMouseEnter={e => (e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,.08)")} onMouseLeave={e => (e.currentTarget.style.boxShadow="")}>
                {l.category && <span style={{ fontSize: ".75rem", background: "#eff6ff", color: "#3b82f6", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>{l.category}</span>}
                <h3 style={{ fontWeight: 700, fontSize: "1rem", margin: "10px 0 6px" }}>{l.title}</h3>
                {l.description && <p style={{ fontSize: ".8125rem", color: "#64748b", lineHeight: 1.5, marginBottom: 10 }}>{l.description}</p>}
                <div style={{ fontSize: ".8125rem", color: "#475569", marginBottom: 12 }}>원하는 것: <strong>{l.want_for}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: ".75rem", color: "#94a3b8" }}>{relTime(Number(l.created_at))}</span>
                  <button onClick={e => { e.stopPropagation(); setSelected(l); setOfferDone(false); setOfferError(""); setOfferForm({ offer_title: "", offer_description: "" }); }} style={{ padding: "5px 14px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: ".8125rem", fontWeight: 600 }}>제안하기</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {selected.category && <span style={{ fontSize: ".75rem", background: "#eff6ff", color: "#3b82f6", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>{selected.category}</span>}
              </div>
              <h2 style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: 6 }}>{selected.title}</h2>
              {selected.description && <p style={{ fontSize: ".875rem", color: "#64748b", lineHeight: 1.6, marginBottom: 10 }}>{selected.description}</p>}
              <p style={{ fontSize: ".875rem" }}>원하는 것: <strong>{selected.want_for}</strong></p>
            </div>

            {offerDone ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ fontWeight: 600, color: "#166534", marginBottom: 6 }}>제안이 전송됐습니다!</p>
                <p style={{ fontSize: ".875rem", color: "#64748b", marginBottom: 16 }}>상대방이 수락하면 알림이 갑니다.</p>
                <button onClick={() => setSelected(null)} style={{ padding: "8px 20px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer" }}>닫기</button>
              </div>
            ) : (
              <form onSubmit={makeOffer} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h3 style={{ fontWeight: 600, fontSize: ".9375rem", marginBottom: 4 }}>교환 제안하기</h3>
                {offerError && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "8px 12px", borderRadius: 8, fontSize: ".875rem" }}>{offerError}</div>}
                <div>
                  <label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>제안할 물건 *</label>
                  <input value={offerForm.offer_title} onChange={e => setOfferForm(p => ({ ...p, offer_title: e.target.value }))} required placeholder="내가 줄 수 있는 것" style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: ".875rem", background: "#f8fafc", color: "#1e293b", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>설명 (선택)</label>
                  <textarea value={offerForm.offer_description} onChange={e => setOfferForm(p => ({ ...p, offer_description: e.target.value }))} rows={3} placeholder="상태, 조건 등 자세히 적어주세요" style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: ".875rem", background: "#f8fafc", color: "#1e293b", resize: "vertical", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setSelected(null)} style={{ padding: "8px 16px", border: "1px solid #e2e8f0", borderRadius: 8, background: "transparent", cursor: "pointer" }}>취소</button>
                  <button type="submit" disabled={offering} style={{ padding: "8px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{offering ? "전송 중..." : "제안 전송"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
