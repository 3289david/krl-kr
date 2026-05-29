"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { AltchaWidget } from "@/components/AltchaWidget";

interface EmailAlias {
  id: string;
  alias: string;
  email: string;
  is_active: boolean;
  cf_configured: boolean;
}

interface EmailMessage {
  id: string;
  alias: string;
  email: string;
  from: string;
  to: string;
  subject: string;
  preview: string;
  is_read: boolean;
  received_at: string;
  size: number;
}

interface EmailDetail extends EmailMessage {
  body_text: string;
  body_html: string;
  headers: Record<string, string>;
}

export default function EmailInboxPage() {
  const [aliases, setAliases] = useState<EmailAlias[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selected, setSelected] = useState<EmailDetail | null>(null);
  const [activeAlias, setActiveAlias] = useState<string | null>(null);
  const [newAlias, setNewAlias] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const createFormRef = useRef<HTMLFormElement>(null);

  // Admin check — skip Altcha & frontend limits for admin
  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((d) => setIsAdmin(!!d.isAdmin))
      .catch(() => {});
  }, []);

  // Load aliases
  const loadAliases = useCallback(async () => {
    const res = await fetch("/api/v1/email");
    if (res.ok) {
      const data = await res.json() as { aliases: EmailAlias[] };
      setAliases(data.aliases ?? []);
    }
  }, []);

  // Load messages
  const loadMessages = useCallback(async () => {
    const url = activeAlias
      ? `/api/v1/email/inbox?alias=${activeAlias}&limit=100`
      : `/api/v1/email/inbox?limit=100`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json() as { messages: EmailMessage[]; unread_count: number };
      setMessages(data.messages ?? []);
      setUnreadCount(data.unread_count ?? 0);
    }
    setLoading(false);
  }, [activeAlias]);

  useEffect(() => {
    loadAliases();
  }, [loadAliases]);

  useEffect(() => {
    setLoading(true);
    loadMessages();
    const interval = setInterval(loadMessages, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [loadMessages]);

  async function openMessage(msg: EmailMessage) {
    const res = await fetch(`/api/v1/email/inbox/${msg.id}`);
    if (res.ok) {
      const detail = await res.json() as EmailDetail;
      setSelected(detail);
      // Update unread count locally
      if (!msg.is_read) {
        setMessages((prev) =>
          prev.map((m) => m.id === msg.id ? { ...m, is_read: true } : m)
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    }
  }

  async function deleteMessage(id: string) {
    await fetch(`/api/v1/email/inbox/${id}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function createAlias(e: React.FormEvent) {
    e.preventDefault();
    if (!newAlias.trim()) return;
    setCreating(true);
    setError("");
    const altchaEl = createFormRef.current?.querySelector<HTMLInputElement>('input[name="altcha"]');
    const altchaPayload = altchaEl?.value ?? null;
    const res = await fetch("/api/v1/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias: newAlias.trim().toLowerCase(), altcha: altchaPayload }),
    });
    const data = await res.json() as { error?: string; email?: string };
    if (!res.ok) {
      setError(data.error ?? "오류가 발생했습니다.");
    } else {
      setNewAlias("");
      setShowCreateForm(false);
      await loadAliases();
    }
    setCreating(false);
  }

  async function deleteAlias(id: string) {
    await fetch(`/api/v1/email?id=${id}`, { method: "DELETE" });
    await loadAliases();
    setActiveAlias(null);
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function safeMs(val: string | number | null | undefined): number | null {
    if (val == null) return null;
    if (typeof val === "number") return val;
    if (/^\d+$/.test(String(val).trim())) return Number(val);
    const t = new Date(val).getTime();
    return isNaN(t) ? null : t;
  }

  function formatDate(val: string | number | null | undefined): string {
    const ms = safeMs(val);
    if (ms == null) return "—";
    const d = new Date(ms);
    const diff = Date.now() - ms;
    if (diff < 60000) return "방금 전";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  }

  function formatDateFull(val: string | number | null | undefined): string {
    const ms = safeMs(val);
    if (ms == null) return "—";
    return new Date(ms).toLocaleString("ko-KR");
  }

  // Suppress unused variable warning
  void formatSize;

  return (
    <div style={{ height: "calc(100vh - 52px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 600, letterSpacing: "-0.02em" }}>
            받은 편지함
          </h1>
          {unreadCount > 0 && (
            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginTop: "2px" }}>
              읽지 않은 메일 {unreadCount}개
            </p>
          )}
        </div>

        {/* Create alias button */}
        <button
          onClick={() => setShowCreateForm((v) => !v)}
          className="btn btn-primary btn-sm btn-pill"
        >
          {showCreateForm ? "취소" : "+ 주소 추가"}
        </button>
      </div>

      {/* Create alias form panel */}
      {showCreateForm && (
        <div style={{ margin: "0 24px 16px", padding: "20px 24px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline-strong)", borderRadius: "12px" }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "14px" }}>새 이메일 주소 추가</p>
          <form ref={createFormRef} onSubmit={createAlias} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: "6px" }}>주소 이름</label>
              <div style={{ display: "flex", alignItems: "center", gap: "0", border: "1px solid var(--color-hairline-strong)", borderRadius: "8px", overflow: "hidden", background: "var(--color-canvas)" }}>
                <input
                  type="text"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                  placeholder="myname"
                  required
                  autoFocus
                  style={{ border: "none", borderRadius: 0, padding: "9px 14px", flex: 1, background: "transparent", fontSize: "0.875rem", outline: "none" }}
                />
                <span style={{ padding: "0 14px", fontSize: "0.8125rem", color: "var(--color-muted)", whiteSpace: "nowrap", borderLeft: "1px solid var(--color-hairline)" }}>@krl.kr</span>
              </div>
            </div>
            {/* Altcha PoW CAPTCHA — admin은 우회 */}
            {!isAdmin && <AltchaWidget name="altcha" />}
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" onClick={() => { setShowCreateForm(false); setError(""); }} className="btn btn-secondary btn-pill" style={{ flex: 1, justifyContent: "center" }}>취소</button>
              <button type="submit" disabled={creating || !newAlias.trim()} className="btn btn-primary btn-pill" style={{ flex: 1, justifyContent: "center" }}>
                {creating ? "생성 중..." : "주소 만들기"}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div style={{ margin: "0 24px 16px", padding: "10px 16px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "var(--radius-sm)", fontSize: "0.875rem", color: "#9B1C1C" }}>
          {error}
        </div>
      )}

      {/* Main layout: sidebar + list + reader */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left: Alias sidebar */}
        <div style={{ width: "200px", flexShrink: 0, borderRight: "1px solid var(--color-hairline)", padding: "16px 12px", overflowY: "auto" }}>
          <button
            onClick={() => setActiveAlias(null)}
            style={{
              width: "100%", textAlign: "left", padding: "8px 12px",
              borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
              background: activeAlias === null ? "var(--color-surface-card)" : "transparent",
              fontWeight: activeAlias === null ? 600 : 400,
              fontSize: "0.875rem", color: "var(--color-ink)",
            }}
          >
            전체 받은 메일
          </button>

          <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-ash)", padding: "12px 12px 4px" }}>내 주소</p>

          {aliases.length === 0 ? (
            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", padding: "8px 12px" }}>아직 없음</p>
          ) : (
            aliases.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button
                  onClick={() => setActiveAlias(a.alias)}
                  style={{
                    flex: 1, textAlign: "left", padding: "7px 12px",
                    borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
                    background: activeAlias === a.alias ? "var(--color-surface-card)" : "transparent",
                    fontWeight: activeAlias === a.alias ? 600 : 400,
                    fontSize: "0.8125rem", color: "var(--color-ink)",
                  }}
                >
                  {a.alias}
                  {!a.cf_configured && (
                    <span style={{ marginLeft: "4px", fontSize: "0.625rem", color: "var(--color-warning)", fontWeight: 700 }}>!</span>
                  )}
                </button>
                <button
                  onClick={() => deleteAlias(a.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-ash)", padding: "4px", fontSize: "0.75rem", flexShrink: 0 }}
                  title="삭제"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))
          )}

          {aliases.length < 5 && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", padding: "8px 12px", marginTop: "8px", borderTop: "1px solid var(--color-hairline)", paddingTop: "12px" }}>
              {5 - aliases.length}개 더 추가 가능
            </p>
          )}
        </div>

        {/* Center: Message list */}
        <div style={{ width: "320px", flexShrink: 0, borderRight: "1px solid var(--color-hairline)", overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem" }}>불러오는 중...</div>
          ) : messages.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--color-ash)", margin: "0 auto 16px", display: "block" }}>
                <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              <p style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--color-ink)", marginBottom: "6px" }}>받은 메일 없음</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                {aliases.length === 0
                  ? "먼저 이메일 주소를 만들어보세요"
                  : "메일을 보내면 여기에 표시됩니다"}
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => openMessage(msg)}
                style={{
                  width: "100%", textAlign: "left", padding: "16px 20px",
                  borderBottom: "1px solid var(--color-hairline)",
                  background: selected?.id === msg.id ? "var(--color-canvas)" : "transparent",
                  border: "none", cursor: "pointer", display: "block",
                  borderRight: selected?.id === msg.id ? "2px solid var(--color-ink)" : "2px solid transparent",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "0.8125rem", fontWeight: msg.is_read ? 400 : 700, color: "var(--color-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>
                    {msg.from.replace(/<.*>/, "").trim() || msg.from}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", flexShrink: 0, marginLeft: "8px" }}>
                    {formatDate(msg.received_at)}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  {!msg.is_read && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-arc)", flexShrink: 0, display: "inline-block" }} />}
                  <span style={{ fontSize: "0.875rem", fontWeight: msg.is_read ? 400 : 600, color: "var(--color-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {msg.subject || "(제목 없음)"}
                  </span>
                </div>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {msg.preview || "(내용 없음)"}
                </p>
                <span style={{ fontSize: "0.6875rem", color: "var(--color-ash)", marginTop: "2px", display: "block" }}>
                  {msg.alias}@krl.kr
                </span>
              </button>
            ))
          )}
        </div>

        {/* Right: Message reader */}
        <div style={{ flex: 1, overflowY: "auto", background: "var(--color-lifted)" }}>
          {!selected ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "16px" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ color: "var(--color-dust)" }}>
                <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>메일을 선택하세요</p>
            </div>
          ) : (
            <div style={{ padding: "32px 40px" }}>
              {/* Email header */}
              <div style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid var(--color-hairline)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 600, letterSpacing: "-0.02em", maxWidth: "600px" }}>
                    {selected.subject || "(제목 없음)"}
                  </h2>
                  <button
                    onClick={() => deleteMessage(selected.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ flexShrink: 0, color: "var(--color-danger)" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    삭제
                  </button>
                </div>

                <div style={{ display: "grid", gap: "6px", fontSize: "0.875rem" }}>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <span style={{ color: "var(--color-muted)", width: "40px", flexShrink: 0 }}>보낸이</span>
                    <span style={{ color: "var(--color-ink)", fontWeight: 500 }}>{selected.from}</span>
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <span style={{ color: "var(--color-muted)", width: "40px", flexShrink: 0 }}>받는이</span>
                    <span style={{ color: "var(--color-ink)" }}>{selected.to}</span>
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <span style={{ color: "var(--color-muted)", width: "40px", flexShrink: 0 }}>날짜</span>
                    <span style={{ color: "var(--color-ink)" }}>
                      {formatDateFull(selected.received_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Email body */}
              {selected.body_html ? (
                <div
                  style={{ fontSize: "0.9375rem", lineHeight: 1.7, color: "var(--color-body)" }}
                  dangerouslySetInnerHTML={{ __html: selected.body_html }}
                />
              ) : (
                <pre style={{ fontSize: "0.9375rem", lineHeight: 1.7, color: "var(--color-body)", whiteSpace: "pre-wrap", fontFamily: "var(--font-sans)" }}>
                  {selected.body_text || "(내용 없음)"}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
