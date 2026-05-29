"use client";
import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";

interface MeetingMsg {
  id: number; sender_email: string; message: string; created_at: number;
}

interface Meeting {
  id: number; title: string; created_by: string; status: string; created_at: number;
}

export default function MeetingRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [messages, setMessages] = useState<MeetingMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [myEmail, setMyEmail] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadMeeting() {
    const res = await fetch(`/api/admin/meetings/${id}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMeeting(data.meeting);
      setMessages(data.messages ?? []);
    }
  }

  useEffect(() => {
    fetch("/api/admin/check").then(r => r.json()).then(d => setMyEmail(d.email ?? ""));
    loadMeeting();
    pollRef.current = setInterval(loadMeeting, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || meeting?.status === "closed") return;
    setSending(true);
    await fetch(`/api/admin/meetings/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input.trim() }),
    });
    setInput("");
    loadMeeting();
    setSending(false);
  }

  function formatTime(ts: number) {
    return new Date(Number(ts)).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  if (!meeting) return <div style={{ padding: "48px", textAlign: "center", color: "var(--color-muted)" }}>로딩 중...</div>;

  return (
    <div style={{ padding: "32px", display: "flex", flexDirection: "column", height: "calc(100vh - 64px - 64px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <Link href="/dashboard/admin/meetings" style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          color: "var(--color-muted)", textDecoration: "none", fontSize: "0.875rem",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          회의 목록
        </Link>
        <span style={{ color: "var(--color-hairline)" }}>|</span>
        <h1 style={{ fontSize: "1.125rem", fontWeight: 700 }}>{meeting.title}</h1>
        <span style={{
          fontSize: "0.7rem", padding: "2px 8px", borderRadius: "var(--radius-pill)", fontWeight: 700,
          background: meeting.status === "open" ? "#05966920" : "var(--color-surface-card)",
          color: meeting.status === "open" ? "#059669" : "var(--color-muted)",
        }}>
          {meeting.status === "open" ? "진행 중" : "종료됨"}
        </span>
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0",
        borderRadius: "var(--radius-xl)", display: "flex", flexDirection: "column", overflow: "hidden",
        minHeight: 0,
      }}>
        {/* Messages */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {messages.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--color-muted)", marginTop: "40px", fontSize: "0.9rem" }}>
              아직 메시지가 없습니다. 첫 번째 발언을 시작하세요.
            </p>
          ) : messages.map((m) => {
            const isMe = m.sender_email === myEmail;
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", gap: "8px" }}>
                {!isMe && (
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "50%",
                    background: "#4f46e5", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 700, color: "#ffffff", flexShrink: 0,
                  }}>
                    {m.sender_email[0].toUpperCase()}
                  </div>
                )}
                <div style={{ maxWidth: "65%" }}>
                  {!isMe && (
                    <p style={{ fontSize: "0.7rem", color: "#6b7280", marginBottom: "4px", fontWeight: 700 }}>
                      {m.sender_email}
                    </p>
                  )}
                  <div style={{
                    background: isMe ? "#2563eb" : "#ffffff",
                    color: isMe ? "#ffffff" : "#111827",
                    border: isMe ? "none" : "1px solid #e5e7eb",
                    borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    padding: "10px 14px",
                    boxShadow: isMe ? "0 1px 3px rgba(37,99,235,0.3)" : "0 1px 2px rgba(0,0,0,0.05)",
                  }}>
                    <p style={{ fontSize: "0.9rem", lineHeight: 1.55, whiteSpace: "pre-wrap", fontWeight: 500 }}>{m.message}</p>
                  </div>
                  <p style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "3px", textAlign: isMe ? "right" : "left" }}>
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--color-hairline)", display: "flex", gap: "10px" }}>
          {meeting.status === "closed" ? (
            <p style={{ flex: 1, textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem", padding: "8px" }}>
              이 회의는 종료되었습니다.
            </p>
          ) : (
            <>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="메시지 입력... (Shift+Enter: 줄바꿈)"
                rows={1}
                style={{
                  flex: 1, padding: "10px 14px", border: "1px solid var(--color-hairline)",
                  borderRadius: "var(--radius-pill)", background: "var(--color-canvas)",
                  fontSize: "0.875rem", color: "var(--color-ink)", resize: "none",
                  outline: "none", fontFamily: "var(--font-sans)",
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="btn btn-primary btn-pill"
                style={{ flexShrink: 0 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
