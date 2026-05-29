"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface ChatRoom {
  room_id: string; user_email: string | null; user_name: string | null;
  last_message_at: number; message_count: number; unread_count: number;
}

interface ChatMessage {
  id: number; sender_email: string; sender_role: string; message: string; created_at: number;
}

export default function AdminChatPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRooms = useCallback(async () => {
    const res = await fetch("/api/admin/chat?rooms=1");
    if (res.ok) {
      const data = await res.json();
      setRooms(data.rooms ?? []);
    }
  }, []);

  const loadMessages = useCallback(async (roomId: string) => {
    const res = await fetch(`/api/admin/chat?room=${roomId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
      loadRooms();
    }
  }, [loadRooms]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  useEffect(() => {
    if (!activeRoom) return;
    loadMessages(activeRoom);
    pollRef.current = setInterval(() => loadMessages(activeRoom), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeRoom, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !activeRoom) return;
    setSending(true);
    await fetch("/api/admin/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input.trim(), room_id: activeRoom }),
    });
    setInput("");
    loadMessages(activeRoom);
    setSending(false);
  }

  function formatTime(ts: number) {
    return new Date(Number(ts)).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }

  const activeRoomInfo = rooms.find(r => r.room_id === activeRoom);

  return (
    <div style={{ padding: "32px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "24px" }}>지원 채팅</h1>

      <div style={{
        display: "grid", gridTemplateColumns: "270px 1fr", gap: "0",
        height: "620px", background: "#f8fafc",
        border: "1px solid #e2e8f0", borderRadius: "var(--radius-xl)", overflow: "hidden",
      }}>
        {/* Rooms list */}
        <div style={{ borderRight: "1px solid var(--color-hairline)", overflow: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-hairline)", fontWeight: 700, fontSize: "0.875rem", flexShrink: 0 }}>
            채팅방 ({rooms.length})
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {rooms.length === 0 ? (
              <p style={{ padding: "24px 16px", color: "var(--color-muted)", fontSize: "0.875rem", textAlign: "center" }}>
                아직 문의가 없습니다
              </p>
            ) : rooms.map(r => (
              <button key={r.room_id} onClick={() => setActiveRoom(r.room_id)} style={{
                width: "100%", padding: "12px 14px", textAlign: "left",
                background: activeRoom === r.room_id ? "var(--color-surface-card)" : "transparent",
                border: "none", borderBottom: "1px solid var(--color-hairline)", cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-ink)" }}>
                    {r.user_name ?? r.user_email ?? r.room_id.slice(0, 8)}
                  </span>
                  {r.unread_count > 0 && (
                    <span style={{ fontSize: "0.65rem", background: "#DC2626", color: "white", borderRadius: "10px", padding: "1px 5px", fontWeight: 700 }}>
                      {r.unread_count}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{r.user_email ?? ""}</p>
                <p style={{ fontSize: "0.7rem", color: "var(--color-muted)", marginTop: "2px" }}>
                  {r.last_message_at ? new Date(Number(r.last_message_at)).toLocaleDateString("ko-KR") : ""}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        {activeRoom ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{activeRoomInfo?.user_name ?? activeRoomInfo?.user_email ?? activeRoom}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{activeRoomInfo?.user_email}</p>
              </div>
              <Link href={`/dashboard/admin/users/${activeRoom}`} className="btn btn-ghost btn-sm" style={{ fontSize: "0.8rem" }}>
                사용자 상세
              </Link>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {messages.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem", marginTop: "40px" }}>메시지 없음</p>
              ) : messages.map(m => {
                const isAdminMsg = m.sender_role === "admin";
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: isAdminMsg ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "70%" }}>
                      {!isAdminMsg && (
                        <p style={{ fontSize: "0.7rem", marginBottom: "3px", color: "#6b7280", fontWeight: 700 }}>
                          {m.sender_email}
                        </p>
                      )}
                      <div style={{
                        background: isAdminMsg ? "#2563eb" : "#ffffff",
                        color: isAdminMsg ? "#ffffff" : "#111827",
                        border: isAdminMsg ? "none" : "1px solid #e5e7eb",
                        borderRadius: isAdminMsg ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        padding: "10px 14px",
                        boxShadow: isAdminMsg ? "0 1px 3px rgba(37,99,235,0.3)" : "0 1px 2px rgba(0,0,0,0.05)",
                      }}>
                        <p style={{ fontSize: "0.875rem", lineHeight: 1.5, fontWeight: 500 }}>{m.message}</p>
                      </div>
                      <p style={{
                        fontSize: "0.7rem", marginTop: "3px",
                        color: "#9ca3af",
                        textAlign: isAdminMsg ? "right" : "left",
                      }}>
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
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="답변 입력... (Enter 전송)"
                style={{
                  flex: 1, padding: "9px 14px", border: "1px solid var(--color-hairline)",
                  borderRadius: "var(--radius-pill)", background: "var(--color-canvas)",
                  fontSize: "0.875rem", color: "var(--color-ink)", outline: "none",
                }}
              />
              <button onClick={handleSend} disabled={sending || !input.trim()} className="btn btn-primary btn-pill" style={{ flexShrink: 0, padding: "0 16px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-muted)", flexDirection: "column", gap: "12px" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p style={{ fontSize: "0.9rem" }}>채팅방을 선택하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
