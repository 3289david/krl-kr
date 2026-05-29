"use client";
import { useState, useEffect } from "react";

interface Notice {
  id: number; title: string; content: string; author_email: string;
  notice_type: string; pinned: number; popup: number;
  popup_expires_at: number | null; visible: number; created_at: number;
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", content: "", notice_type: "notice",
    pinned: false, popup: false, popup_expires_at: "",
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/notices");
    if (res.ok) {
      const data = await res.json();
      setNotices(data.notices ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit() {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    await fetch("/api/admin/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        popup_expires_at: form.popup && form.popup_expires_at
          ? new Date(form.popup_expires_at).getTime()
          : null,
      }),
    });
    setShowForm(false);
    setForm({ title: "", content: "", notice_type: "notice", pinned: false, popup: false, popup_expires_at: "" });
    load();
    setSaving(false);
  }

  async function handleToggle(id: number, field: string, value: number) {
    await fetch(`/api/admin/notices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("공지를 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/notices/${id}`, { method: "DELETE" });
    load();
  }

  const typeLabel = (t: string) => ({ notice: "공지", update: "업데이트", legal: "법적고지", event: "이벤트" }[t] ?? t);

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "4px" }}>공지 관리</h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>팝업 공지, 고정 공지, 법적 고지 관리</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-pill">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          새 공지 작성
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{
          background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
          borderRadius: "var(--radius-xl)", padding: "24px", marginBottom: "24px",
        }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>공지 작성</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="공지 제목"
              style={{
                padding: "10px 12px", border: "1px solid var(--color-hairline)",
                borderRadius: "var(--radius-md)", fontSize: "0.9rem", background: "var(--color-canvas)", color: "var(--color-ink)",
              }}
            />
            <textarea
              value={form.content}
              onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="공지 내용"
              rows={5}
              style={{
                padding: "10px 12px", border: "1px solid var(--color-hairline)",
                borderRadius: "var(--radius-md)", fontSize: "0.9rem", background: "var(--color-canvas)",
                color: "var(--color-ink)", resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <select
                value={form.notice_type}
                onChange={(e) => setForm(f => ({ ...f, notice_type: e.target.value }))}
                style={{
                  padding: "9px 12px", border: "1px solid var(--color-hairline)",
                  borderRadius: "var(--radius-md)", fontSize: "0.875rem",
                  background: "var(--color-canvas)", color: "var(--color-ink)",
                }}
              >
                <option value="notice">일반 공지</option>
                <option value="update">업데이트</option>
                <option value="legal">법적 고지</option>
                <option value="event">이벤트</option>
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.875rem", cursor: "pointer" }}>
                <input type="checkbox" checked={form.pinned} onChange={(e) => setForm(f => ({ ...f, pinned: e.target.checked }))} />
                상단 고정
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.875rem", cursor: "pointer" }}>
                <input type="checkbox" checked={form.popup} onChange={(e) => setForm(f => ({ ...f, popup: e.target.checked }))} />
                팝업 공지
              </label>
              {form.popup && (
                <input
                  type="datetime-local"
                  value={form.popup_expires_at}
                  onChange={(e) => setForm(f => ({ ...f, popup_expires_at: e.target.value }))}
                  style={{
                    padding: "9px 12px", border: "1px solid var(--color-hairline)",
                    borderRadius: "var(--radius-md)", fontSize: "0.875rem",
                    background: "var(--color-canvas)", color: "var(--color-ink)",
                  }}
                />
              )}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">취소</button>
              <button onClick={handleSubmit} disabled={saving || !form.title.trim() || !form.content.trim()} className="btn btn-primary btn-sm">
                {saving ? "저장 중..." : "공지 게시"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notices list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--color-muted)", padding: "48px" }}>로딩 중...</p>
        ) : notices.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--color-muted)", padding: "48px" }}>공지가 없습니다.</p>
        ) : notices.map((n) => (
          <div key={n.id} style={{
            background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
            borderRadius: "var(--radius-lg)", padding: "16px 20px",
            opacity: n.visible ? 1 : 0.5,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", justifyContent: "space-between", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{n.title}</span>
                  <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", background: "var(--color-surface-card)", color: "var(--color-muted)", fontWeight: 600 }}>
                    {typeLabel(n.notice_type)}
                  </span>
                  {n.pinned ? (
                    <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", background: "#7C3AED20", color: "#7C3AED", fontWeight: 600 }}>고정</span>
                  ) : null}
                  {n.popup ? (
                    <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", background: "#059669"  + "20", color: "#059669", fontWeight: 600 }}>팝업</span>
                  ) : null}
                  {!n.visible ? (
                    <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", background: "#DC262620", color: "#DC2626", fontWeight: 600 }}>숨김</span>
                  ) : null}
                </div>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {n.content}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "6px" }}>
                  {new Date(Number(n.created_at)).toLocaleDateString("ko-KR")} · {n.author_email}
                </p>
              </div>
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <button
                  onClick={() => handleToggle(n.id, "visible", n.visible ? 0 : 1)}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: "0.8rem" }}
                >{n.visible ? "숨김" : "표시"}</button>
                <button
                  onClick={() => handleToggle(n.id, "pinned", n.pinned ? 0 : 1)}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: "0.8rem" }}
                >{n.pinned ? "고정 해제" : "고정"}</button>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="btn btn-ghost btn-sm"
                  style={{ color: "#DC2626", fontSize: "0.8rem" }}
                >삭제</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
