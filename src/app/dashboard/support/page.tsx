"use client";
import { useState, useEffect, useRef } from "react";

interface ChatMessage {
  id: number; sender_email: string; sender_role: string; message: string; created_at: number;
}

export default function SupportChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [myEmail, setMyEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadMessages() {
    const res = await fetch("/api/admin/chat");
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setMyEmail(d.user.email);
          setIsLoggedIn(true);
          loadMessages();
          pollRef.current = setInterval(loadMessages, 5000);
        }
      });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim()) return;
    setSending(true);
    await fetch("/api/admin/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input.trim() }),
    });
    setInput("");
    loadMessages();
    setSending(false);
  }

  function formatTime(ts: number) {
    return new Date(Number(ts)).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  if (!isLoggedIn) {
    return (
      <div style={{ padding: "48px", textAlign: "center" }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-muted)", margin: "0 auto 16px" }}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <h2 style={{ fontWeight: 700, marginBottom: "8px" }}>로그인이 필요합니다</h2>
        <p style={{ color: "var(--color-muted)", marginBottom: "20px" }}>관리자에게 문의하려면 로그인하세요.</p>
        <a href="/login" className="btn btn-primary btn-pill">로그인</a>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "4px" }}>관리자 문의</h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>
          궁금한 점이나 문제가 있으면 여기서 관리자에게 직접 문의하세요.
        </p>
      </div>

      <div style={{
        background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
        borderRadius: "var(--radius-xl)", overflow: "hidden", height: "560px",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid var(--color-hairline)",
          display: "flex", alignItems: "center", gap: "10px",
        }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%", background: "#059669",
          }} />
          <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>KRL.KR 지원팀</span>
          <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>· 보통 수 시간 내 응답</span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", marginTop: "40px", color: "var(--color-muted)" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", opacity: 0.3 }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p style={{ fontSize: "0.9rem" }}>아직 대화가 없습니다.</p>
              <p style={{ fontSize: "0.8125rem", marginTop: "4px" }}>궁금한 점을 아래에 입력하세요.</p>
            </div>
          ) : messages.map((m) => {
            const isMe = m.sender_role === "user";
            const isAdmin = m.sender_role === "admin";
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", gap: "8px" }}>
                {isAdmin && (
                  <div style={{
                    width: "30px", height: "30px", borderRadius: "50%",
                    background: "var(--color-ink)", display: "flex",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-canvas)" strokeWidth="2.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                )}
                <div style={{ maxWidth: "70%" }}>
                  {isAdmin && (
                    <p style={{ fontSize: "0.7rem", color: "var(--color-muted)", marginBottom: "3px", fontWeight: 600 }}>
                      KRL.KR 관리자
                    </p>
                  )}
                  <div style={{
                    background: isMe ? "var(--color-ink)" : "var(--color-surface-card)",
                    color: isMe ? "var(--color-canvas)" : "var(--color-ink)",
                    borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    padding: "10px 14px",
                  }}>
                    <p style={{ fontSize: "0.875rem", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{m.message}</p>
                  </div>
                  <p style={{ fontSize: "0.7rem", color: "var(--color-muted)", marginTop: "3px", textAlign: isMe ? "right" : "left" }}>
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--color-hairline)", display: "flex", gap: "8px" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="메시지 입력..."
            style={{
              flex: 1, padding: "10px 14px", border: "1px solid var(--color-hairline)",
              borderRadius: "var(--radius-pill)", background: "var(--color-canvas)",
              fontSize: "0.875rem", color: "var(--color-ink)", outline: "none",
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="btn btn-primary btn-pill"
            style={{ flexShrink: 0, padding: "0 16px" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginTop: "12px", textAlign: "center" }}>
        <strong>{myEmail}</strong>으로 로그인됨 · 모든 대화는 운영팀에게만 공개됩니다
      </p>
    </div>
  );
}
