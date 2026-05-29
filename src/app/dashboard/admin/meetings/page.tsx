"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Meeting {
  id: number; title: string; created_by: string; status: string;
  created_at: number; message_count: number; last_sender: string | null; last_message_at: number | null;
}

export default function AdminMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/meetings");
    if (res.ok) {
      const data = await res.json();
      setMeetings(data.meetings ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const res = await fetch("/api/admin/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    if (res.ok) {
      setNewTitle("");
      load();
    }
    setCreating(false);
  }

  async function toggleStatus(id: number, current: string) {
    await fetch(`/api/admin/meetings/${id}/messages`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: current === "open" ? "closed" : "open" }),
    });
    load();
  }

  return (
    <div style={{ padding: "32px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "8px" }}>관리자 회의</h1>
      <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", marginBottom: "24px" }}>
        관리자간 내부 회의 채팅방
      </p>

      {/* Create */}
      <div style={{
        display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap",
      }}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          placeholder="새 회의 제목 입력..."
          style={{
            flex: "1", minWidth: "200px", padding: "9px 14px",
            border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-md)",
            background: "var(--color-lifted)", fontSize: "0.9rem", color: "var(--color-ink)",
          }}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newTitle.trim()}
          className="btn btn-primary btn-pill"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          회의 개설
        </button>
      </div>

      {/* Meetings */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--color-muted)", padding: "48px" }}>로딩 중...</p>
        ) : meetings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "var(--color-muted)" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: "12px" }}>
              <path d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
            </svg>
            <p>회의가 없습니다. 위에서 새 회의를 개설하세요.</p>
          </div>
        ) : meetings.map((m) => (
          <div key={m.id} style={{
            background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
            borderRadius: "var(--radius-lg)", padding: "16px 20px",
            display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--color-ink)" }}>{m.title}</span>
                <span style={{
                  fontSize: "0.7rem", padding: "2px 7px", borderRadius: "var(--radius-pill)", fontWeight: 700,
                  background: m.status === "open" ? "#05966920" : "var(--color-surface-card)",
                  color: m.status === "open" ? "#059669" : "var(--color-muted)",
                }}>
                  {m.status === "open" ? "진행 중" : "종료"}
                </span>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                {m.created_by} · {new Date(Number(m.created_at)).toLocaleDateString("ko-KR")} ·{" "}
                메시지 {m.message_count}개
                {m.last_message_at ? ` · 마지막 ${new Date(Number(m.last_message_at)).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              <Link href={`/dashboard/admin/meetings/${m.id}`} className="btn btn-primary btn-sm btn-pill">
                입장
              </Link>
              <button
                onClick={() => toggleStatus(m.id, m.status)}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: "0.8rem", color: m.status === "open" ? "#D97706" : "#059669" }}
              >
                {m.status === "open" ? "종료" : "재개"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
