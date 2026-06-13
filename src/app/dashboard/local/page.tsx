"use client";
import { useState, useEffect, useRef } from "react";

interface Space { id: string; name: string; code: string; description?: string; ssid_hint?: string; is_active: number; message_count: number; created_at: number; }
interface Message { id: string; author_name: string; content: string; created_at: number; }

function relTime(ts: number) { const n = Number(ts); const d = Date.now()-n; if(d<60000) return "방금"; if(d<3600000) return `${Math.floor(d/60000)}분 전`; return new Date(n).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }); }
const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-canvas)", color: "var(--color-ink)", boxSizing: "border-box" as const };

export default function LocalDashboard() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", ssid_hint: "" });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Space | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lastTs, setLastTs] = useState(0);
  const msgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/v1/local").then(r => r.json()).then(d => { setSpaces(d.spaces ?? []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/v1/local/${selected.code}/messages`).then(r => r.json()).then(d => {
      const msgs = d.messages ?? [];
      setMessages(msgs);
      if (msgs.length > 0) setLastTs(Number(msgs[msgs.length - 1].created_at));
    });
    const iv = setInterval(async () => {
      if (!selected) return;
      const r = await fetch(`/api/v1/local/${selected.code}/messages?since=${lastTs}`);
      const d = await r.json();
      const newMsgs = d.messages ?? [];
      if (newMsgs.length > 0) {
        setMessages(prev => [...prev, ...newMsgs]);
        setLastTs(Number(newMsgs[newMsgs.length - 1].created_at));
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [selected, lastTs]);

  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight;
  }, [messages]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const r = await fetch("/api/v1/local", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await r.json();
    if (d.space) { setSpaces(prev => [d.space, ...prev]); setCreating(false); setForm({ name: "", description: "", ssid_hint: "" }); }
    setSaving(false);
  }

  async function del(code: string) {
    if (!confirm("공간과 모든 메시지를 삭제하시겠습니까?")) return;
    await fetch(`/api/v1/local/${code}`, { method: "DELETE" });
    setSpaces(prev => prev.filter(s => s.code !== code));
    if (selected?.code === code) { setSelected(null); setMessages([]); }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault(); if (!selected || !msgInput.trim() || !nameInput.trim()) return;
    setSending(true);
    const r = await fetch(`/api/v1/local/${selected.code}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ author_name: nameInput, content: msgInput }) });
    const d = await r.json();
    if (d.message) { setMessages(prev => [...prev, d.message]); setMsgInput(""); setLastTs(Number(d.message.created_at)); }
    setSending(false);
  }

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 2 }}>KRL Local</h1>
          <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>같은 공간의 사람들과 소통 — 와이파이 기반, GPS 불필요</p>
        </div>
        <button onClick={() => setCreating(true)} style={{ padding: "8px 18px", background: "var(--color-ink)", color: "var(--color-canvas)", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".875rem" }}>새 공간</button>
      </div>

      {creating && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={e => e.target === e.currentTarget && setCreating(false)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ fontWeight: 700, marginBottom: 18 }}>새 로컬 공간 만들기</h2>
            <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>공간 이름 *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="3층 세미나실" style={inputStyle} /></div>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>설명</label><input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="세미나실 임시 채팅방" style={inputStyle} /></div>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>와이파이 SSID (힌트)</label><input value={form.ssid_hint} onChange={e => setForm(p => ({ ...p, ssid_hint: e.target.value }))} placeholder="Konyang-WiFi 등" style={inputStyle} /></div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setCreating(false)} style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer" }}>취소</button>
                <button type="submit" disabled={saving} style={{ padding: "8px 20px", background: "var(--color-ink)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "생성 중..." : "생성"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>불러오는 중...</p> : spaces.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px", border: "2px dashed var(--color-hairline)", borderRadius: 12 }}>
              <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>공간이 없습니다</p>
            </div>
          ) : spaces.map(s => (
            <div key={s.id} onClick={() => { setSelected(s); setMessages([]); setLastTs(0); }} style={{ padding: "12px 14px", border: `2px solid ${selected?.id === s.id ? "var(--color-ink)" : "var(--color-hairline)"}`, borderRadius: 10, cursor: "pointer", background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, flex: 1 }}>{s.name}</span>
                <code style={{ fontSize: ".75rem", background: "var(--color-canvas)", padding: "2px 6px", borderRadius: 4 }}>{s.code}</code>
              </div>
              {s.ssid_hint && <p style={{ fontSize: ".75rem", color: "var(--color-muted)" }}>Wi-Fi: {s.ssid_hint}</p>}
              <p style={{ fontSize: ".75rem", color: "var(--color-muted)", marginTop: 4 }}>메시지 {Number(s.message_count)}개</p>
            </div>
          ))}
        </div>

        {selected ? (
          <div style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", height: 600 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700 }}>{selected.name}</span>
                {selected.ssid_hint && <span style={{ fontSize: ".8125rem", color: "var(--color-muted)", marginLeft: 8 }}>Wi-Fi: {selected.ssid_hint}</span>}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: ".8125rem", background: "#f1f5f9", padding: "3px 10px", borderRadius: 8 }}>코드: <strong>{selected.code}</strong></span>
                <a href={`/local/${selected.code}`} target="_blank" style={{ padding: "5px 10px", border: "1px solid var(--color-hairline)", borderRadius: 8, color: "var(--color-body)", textDecoration: "none", fontSize: ".8125rem" }}>공유 링크</a>
                <button onClick={() => del(selected.code)} style={{ padding: "5px 10px", border: "1px solid #fecdd3", borderRadius: 8, background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: ".8125rem" }}>삭제</button>
              </div>
            </div>

            <div ref={msgRef} style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.length === 0 ? <p style={{ color: "var(--color-muted)", fontSize: ".875rem", textAlign: "center", marginTop: 40 }}>아직 메시지가 없습니다. QR 코드나 코드를 공유하세요.</p> :
                messages.map(m => (
                  <div key={m.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `hsl(${m.author_name.charCodeAt(0) * 37 % 360}, 60%, 70%)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: ".8125rem", color: "#fff", flexShrink: 0 }}>{m.author_name[0]}</div>
                    <div>
                      <div style={{ display: "flex", gap: 6, alignItems: "baseline", marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: ".875rem" }}>{m.author_name}</span>
                        <span style={{ fontSize: ".75rem", color: "var(--color-muted)" }}>{relTime(m.created_at)}</span>
                      </div>
                      <div style={{ fontSize: ".875rem", lineHeight: 1.5, color: "var(--color-ink)" }}>{m.content}</div>
                    </div>
                  </div>
                ))
              }
            </div>

            <form onSubmit={sendMessage} style={{ padding: "12px 16px", borderTop: "1px solid var(--color-hairline)", display: "flex", gap: 8 }}>
              <input value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="이름" required style={{ width: 90, padding: "8px 10px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-canvas)", color: "var(--color-ink)", flexShrink: 0 }} />
              <input value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder="메시지 입력..." required style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-canvas)", color: "var(--color-ink)" }} />
              <button type="submit" disabled={sending} style={{ padding: "8px 18px", background: "var(--color-ink)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".875rem" }}>전송</button>
            </form>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, border: "2px dashed var(--color-hairline)", borderRadius: 14 }}>
            <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>왼쪽에서 공간을 선택하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
