"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

interface Message { id: string; author_name: string; content: string; created_at: number; }
interface Space { name: string; description?: string; ssid_hint?: string; }

function relTime(ts: number) { const n = Number(ts); return new Date(n).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }); }

export default function LocalPage() {
  const { code } = useParams() as { code: string };
  const [space, setSpace] = useState<Space | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [name, setName] = useState(() => typeof window !== "undefined" ? (localStorage.getItem("local_name") ?? "") : "");
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [lastTs, setLastTs] = useState(0);
  const msgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/v1/local/${code}`)
      .then(r => r.json())
      .then(d => {
        if (d.space) setSpace(d.space);
        else setError(d.error ?? "공간을 찾을 수 없습니다.");
      }).catch(() => setError("로드 실패"));

    fetch(`/api/v1/local/${code}/messages`)
      .then(r => r.json())
      .then(d => {
        const msgs = d.messages ?? [];
        setMessages(msgs);
        if (msgs.length > 0) setLastTs(Number(msgs[msgs.length - 1].created_at));
      });
  }, [code]);

  useEffect(() => {
    const iv = setInterval(async () => {
      const r = await fetch(`/api/v1/local/${code}/messages?since=${lastTs}`);
      const d = await r.json();
      const newMsgs = d.messages ?? [];
      if (newMsgs.length > 0) {
        setMessages(prev => [...prev, ...newMsgs]);
        setLastTs(Number(newMsgs[newMsgs.length - 1].created_at));
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [code, lastTs]);

  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight;
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault(); if (!name.trim() || !msg.trim()) return;
    setSending(true);
    localStorage.setItem("local_name", name);
    const r = await fetch(`/api/v1/local/${code}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ author_name: name, content: msg }) });
    const d = await r.json();
    if (d.message) { setMessages(prev => [...prev, d.message]); setMsg(""); setLastTs(Number(d.message.created_at)); }
    setSending(false);
  }

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#dc2626", marginBottom: 16 }}>{error}</p>
        <a href="/" style={{ color: "#3b82f6", textDecoration: "none" }}>홈으로</a>
      </div>
    </div>
  );

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2}><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16M16 6v16"/></svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: ".9375rem" }}>{space?.name ?? code}</div>
          {space?.ssid_hint && <div style={{ fontSize: ".75rem", color: "#64748b" }}>Wi-Fi: {space.ssid_hint}</div>}
        </div>
        <div style={{ marginLeft: "auto", fontSize: ".8125rem", background: "#f1f5f9", padding: "4px 12px", borderRadius: 99, color: "#475569" }}>{code}</div>
      </div>

      <div ref={msgRef} style={{ flex: 1, overflow: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 60, color: "#94a3b8" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} style={{ marginBottom: 12 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <p style={{ fontSize: ".875rem" }}>아직 메시지가 없습니다. 먼저 인사해보세요!</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: `hsl(${m.author_name.charCodeAt(0) * 37 % 360}, 55%, 65%)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: ".8125rem", flexShrink: 0 }}>{m.author_name[0]}</div>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 3 }}>
                <span style={{ fontWeight: 600, fontSize: ".875rem", color: "#1e293b" }}>{m.author_name}</span>
                <span style={{ fontSize: ".75rem", color: "#94a3b8" }}>{relTime(m.created_at)}</span>
              </div>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px 12px 12px 12px", padding: "8px 12px", fontSize: ".875rem", color: "#1e293b", lineHeight: 1.5, maxWidth: "calc(100vw - 100px)", wordBreak: "break-word" }}>{m.content}</div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={send} style={{ background: "#fff", borderTop: "1px solid #e2e8f0", padding: "12px 16px", display: "flex", gap: 8, alignItems: "center" }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="이름" required style={{ width: 90, padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: ".875rem", background: "#f8fafc", color: "#1e293b", flexShrink: 0 }} />
        <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="메시지 입력..." required style={{ flex: 1, padding: "9px 14px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: ".875rem", background: "#f8fafc", color: "#1e293b" }} />
        <button type="submit" disabled={sending} style={{ padding: "9px 18px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>
    </div>
  );
}
