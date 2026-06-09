"use client";
import { useState } from "react";

interface LineItem { desc: string; qty: number; price: number; }

function fmtKRW(n: number) { return new Intl.NumberFormat("ko-KR").format(Math.round(n)); }

export default function ReceiptDashboard() {
  const [sender, setSender] = useState({ name: "", email: "", address: "" });
  const [client, setClient] = useState({ name: "", email: "", address: "" });
  const [meta, setMeta] = useState({ number: `INV-${Date.now().toString().slice(-6)}`, date: new Date().toISOString().slice(0, 10), due: "", currency: "KRW", note: "" });
  const [items, setItems] = useState<LineItem[]>([{ desc: "", qty: 1, price: 0 }]);
  const [taxRate, setTaxRate] = useState(10);

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = Math.round(subtotal * taxRate / 100);
  const total = subtotal + tax;
  const currSym = meta.currency === "KRW" ? "₩" : meta.currency === "USD" ? "$" : meta.currency === "EUR" ? "€" : "¥";

  function addItem() { setItems(p => [...p, { desc: "", qty: 1, price: 0 }]); }
  function updateItem(i: number, k: keyof LineItem, v: string | number) { setItems(p => p.map((x, idx) => idx === i ? { ...x, [k]: v } : x)); }
  function removeItem(i: number) { setItems(p => p.filter((_, idx) => idx !== i)); }

  function print() {
    const style = `<style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif; padding: 40px; color: #0f172a; font-size: 14px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
      .title { font-size: 32px; font-weight: 800; color: #6366f1; }
      .meta { text-align: right; font-size: 13px; color: #64748b; }
      .meta p { margin-bottom: 4px; }
      .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 32px; }
      .party h3 { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px; }
      .party p { color: #334155; line-height: 1.6; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
      th { padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #94a3b8; border-bottom: 2px solid #e2e8f0; }
      td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
      .num { text-align: right; }
      .totals { max-width: 280px; margin-left: auto; }
      .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #64748b; }
      .totals-total { display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: 800; color: #0f172a; border-top: 2px solid #0f172a; margin-top: 6px; }
      .note { margin-top: 40px; padding: 16px; background: #f8fafc; border-radius: 8px; font-size: 13px; color: #64748b; line-height: 1.6; }
      .footer { margin-top: 48px; text-align: center; font-size: 11px; color: #94a3b8; }
    </style>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>영수증 ${meta.number}</title>${style}</head><body>
      <div class="header">
        <div>
          <p class="title">INVOICE</p>
          <p style="font-size:14px;color:#64748b;margin-top:4px">${meta.number}</p>
        </div>
        <div class="meta">
          <p><strong>발행일:</strong> ${meta.date}</p>
          ${meta.due ? `<p><strong>지급기한:</strong> ${meta.due}</p>` : ""}
          <p><strong>통화:</strong> ${meta.currency}</p>
        </div>
      </div>
      <div class="parties">
        <div class="party">
          <h3>공급자</h3>
          <p><strong>${sender.name || "—"}</strong></p>
          ${sender.email ? `<p>${sender.email}</p>` : ""}
          ${sender.address ? `<p style="white-space:pre-line">${sender.address}</p>` : ""}
        </div>
        <div class="party">
          <h3>수급자</h3>
          <p><strong>${client.name || "—"}</strong></p>
          ${client.email ? `<p>${client.email}</p>` : ""}
          ${client.address ? `<p style="white-space:pre-line">${client.address}</p>` : ""}
        </div>
      </div>
      <table>
        <thead><tr><th>항목</th><th class="num">수량</th><th class="num">단가</th><th class="num">금액</th></tr></thead>
        <tbody>
          ${items.filter(i => i.desc).map(i => `<tr><td>${i.desc}</td><td class="num">${i.qty}</td><td class="num">${currSym}${fmtKRW(i.price)}</td><td class="num">${currSym}${fmtKRW(i.qty * i.price)}</td></tr>`).join("")}
        </tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>소계</span><span>${currSym}${fmtKRW(subtotal)}</span></div>
        ${taxRate > 0 ? `<div class="totals-row"><span>부가세 (${taxRate}%)</span><span>${currSym}${fmtKRW(tax)}</span></div>` : ""}
        <div class="totals-total"><span>합계</span><span>${currSym}${fmtKRW(total)}</span></div>
      </div>
      ${meta.note ? `<div class="note"><strong>비고:</strong> ${meta.note}</div>` : ""}
      <div class="footer">KRL Receipt로 생성된 문서 · krl.kr</div>
    </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  }

  const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-surface)", color: "var(--color-ink)", boxSizing: "border-box" as const };
  const labelStyle = { display: "block" as const, fontSize: ".8125rem", fontWeight: 600 as const, marginBottom: 4 };
  const sectionStyle = { background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: 14, padding: "clamp(14px,3vw,20px)", marginBottom: 16 };

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 900 }}>
      <style>{`
        @media(max-width:640px){.rc-parties{grid-template-columns:1fr!important}.rc-item-row{flex-direction:column!important;gap:6px!important}.rc-item-row>*{width:100%!important}}
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>KRL Receipt</h1>
          <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>영수증 / 인보이스 생성기 (PDF 출력)</p>
        </div>
        <button onClick={print} style={{ padding: "8px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".9375rem" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            인쇄 / PDF
          </span>
        </button>
      </div>

      {/* Meta */}
      <div style={sectionStyle}>
        <p style={{ fontWeight: 700, fontSize: ".9375rem", marginBottom: 12 }}>인보이스 정보</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
          <div><label style={labelStyle}>번호</label><input value={meta.number} onChange={e => setMeta(p => ({ ...p, number: e.target.value }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>발행일</label><input type="date" value={meta.date} onChange={e => setMeta(p => ({ ...p, date: e.target.value }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>지급기한 (선택)</label><input type="date" value={meta.due} onChange={e => setMeta(p => ({ ...p, due: e.target.value }))} style={inputStyle} /></div>
          <div>
            <label style={labelStyle}>통화</label>
            <select value={meta.currency} onChange={e => setMeta(p => ({ ...p, currency: e.target.value }))} style={inputStyle}>
              <option value="KRW">KRW (₩)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>
          <div><label style={labelStyle}>부가세 (%)</label><input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} min={0} max={100} style={inputStyle} /></div>
        </div>
      </div>

      {/* Parties */}
      <div className="rc-parties" style={{ ...sectionStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: ".875rem", marginBottom: 10 }}>공급자 (나)</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div><label style={labelStyle}>이름/회사명</label><input value={sender.name} onChange={e => setSender(p => ({ ...p, name: e.target.value }))} style={inputStyle} /></div>
            <div><label style={labelStyle}>이메일</label><input type="email" value={sender.email} onChange={e => setSender(p => ({ ...p, email: e.target.value }))} style={inputStyle} /></div>
            <div><label style={labelStyle}>주소</label><textarea value={sender.address} onChange={e => setSender(p => ({ ...p, address: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "none" }} /></div>
          </div>
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: ".875rem", marginBottom: 10 }}>수급자 (클라이언트)</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div><label style={labelStyle}>이름/회사명</label><input value={client.name} onChange={e => setClient(p => ({ ...p, name: e.target.value }))} style={inputStyle} /></div>
            <div><label style={labelStyle}>이메일</label><input type="email" value={client.email} onChange={e => setClient(p => ({ ...p, email: e.target.value }))} style={inputStyle} /></div>
            <div><label style={labelStyle}>주소</label><textarea value={client.address} onChange={e => setClient(p => ({ ...p, address: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "none" }} /></div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div style={sectionStyle}>
        <p style={{ fontWeight: 700, fontSize: ".9375rem", marginBottom: 12 }}>항목</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item, i) => (
            <div key={i} className="rc-item-row" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 3 }}>
                {i === 0 && <label style={labelStyle}>설명</label>}
                <input value={item.desc} onChange={e => updateItem(i, "desc", e.target.value)} placeholder="개발 용역" style={inputStyle} />
              </div>
              <div style={{ flex: 1, minWidth: 70 }}>
                {i === 0 && <label style={labelStyle}>수량</label>}
                <input type="number" value={item.qty} onChange={e => updateItem(i, "qty", parseInt(e.target.value) || 1)} min={1} style={inputStyle} />
              </div>
              <div style={{ flex: 2, minWidth: 100 }}>
                {i === 0 && <label style={labelStyle}>단가 ({currSym})</label>}
                <input type="number" value={item.price} onChange={e => updateItem(i, "price", parseFloat(e.target.value) || 0)} min={0} style={inputStyle} />
              </div>
              <div style={{ flex: 2, minWidth: 100 }}>
                {i === 0 && <label style={labelStyle}>금액</label>}
                <div style={{ ...inputStyle, background: "var(--color-surface)", color: "var(--color-muted)", display: "flex", alignItems: "center", cursor: "default" }}>{currSym}{fmtKRW(item.qty * item.price)}</div>
              </div>
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} style={{ padding: "8px 10px", border: "1px solid #fecdd3", borderRadius: 8, background: "transparent", color: "#dc2626", cursor: "pointer", flexShrink: 0, alignSelf: i === 0 ? "flex-end" : "center" }}>×</button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addItem} style={{ marginTop: 10, padding: "7px 14px", border: "1px dashed var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: ".875rem", color: "var(--color-muted)" }}>+ 항목 추가</button>

        {/* Totals */}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ minWidth: 220 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: ".875rem", color: "var(--color-muted)" }}>
              <span>소계</span><span>{currSym}{fmtKRW(subtotal)}</span>
            </div>
            {taxRate > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: ".875rem", color: "var(--color-muted)" }}>
                <span>부가세 ({taxRate}%)</span><span>{currSym}{fmtKRW(tax)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "2px solid var(--color-hairline)", marginTop: 6, fontWeight: 800, fontSize: "1.125rem", color: "var(--color-ink)" }}>
              <span>합계</span><span>{currSym}{fmtKRW(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      <div style={sectionStyle}>
        <label style={{ ...labelStyle, marginBottom: 8 }}>비고 (선택)</label>
        <textarea value={meta.note} onChange={e => setMeta(p => ({ ...p, note: e.target.value }))} rows={3} placeholder="계좌번호, 결제 방법 등..." style={{ ...inputStyle, resize: "vertical" }} />
      </div>
    </div>
  );
}
