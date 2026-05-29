"use client";
import { useState, useEffect } from "react";

interface Notice {
  id: number; title: string; content: string;
  notice_type: string; pinned: number; popup: number; created_at: number;
}

export default function NoticePopup() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    // Load dismissed from sessionStorage
    try {
      const stored = JSON.parse(sessionStorage.getItem("dismissed_notices") ?? "[]") as number[];
      setDismissed(new Set(stored));
    } catch { /* ignore */ }

    fetch("/api/admin/notices?public=1")
      .then(r => r.ok ? r.json() : { notices: [] })
      .then(d => {
        const popups = (d.notices ?? []).filter((n: Notice) => n.popup === 1);
        setNotices(popups);
      })
      .catch(() => { /* ignore */ });
  }, []);

  function dismiss(id: number) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    sessionStorage.setItem("dismissed_notices", JSON.stringify([...next]));
    setCurrent(c => Math.max(0, c - 1));
  }

  const visible = notices.filter(n => !dismissed.has(n.id));
  if (visible.length === 0) return null;

  const notice = visible[Math.min(current, visible.length - 1)];

  const typeColor: Record<string, string> = {
    legal: "#DC2626", update: "#059669", event: "#7C3AED", notice: "var(--color-ink)",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }}>
      <div style={{
        background: "var(--color-canvas)", borderRadius: "var(--radius-xl)",
        padding: "32px", maxWidth: "480px", width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        animation: "fadeInUp 0.2s ease",
      }}>
        <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Type badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <span style={{
            fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: "var(--radius-pill)",
            background: (typeColor[notice.notice_type] ?? "var(--color-ink)") + "15",
            color: typeColor[notice.notice_type] ?? "var(--color-ink)",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            {{ notice: "공지", update: "업데이트", legal: "법적 고지", event: "이벤트" }[notice.notice_type] ?? notice.notice_type}
          </span>
          {visible.length > 1 && (
            <span style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>
              {Math.min(current, visible.length - 1) + 1} / {visible.length}
            </span>
          )}
        </div>

        {/* Icon */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "var(--radius-md)",
            background: (typeColor[notice.notice_type] ?? "var(--color-ink)") + "10",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: typeColor[notice.notice_type] ?? "var(--color-ink)",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
        </div>

        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "12px" }}>
          {notice.title}
        </h2>
        <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", lineHeight: 1.65, marginBottom: "24px", whiteSpace: "pre-wrap" }}>
          {notice.content}
        </p>

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          {visible.length > 1 && current < visible.length - 1 && (
            <button
              onClick={() => setCurrent(c => c + 1)}
              className="btn btn-ghost btn-sm"
            >다음 공지</button>
          )}
          <button
            onClick={() => dismiss(notice.id)}
            className="btn btn-primary btn-sm btn-pill"
          >확인</button>
        </div>
      </div>
    </div>
  );
}
