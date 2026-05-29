"use client";
import { useState, useEffect } from "react";

interface Admin {
  email: string; role: string; appointed_by: string | null;
  appointed_at: number; notes: string | null; removable: boolean;
}

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/admins");
    if (res.ok) {
      const data = await res.json();
      setAdmins(data.admins ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!newEmail.trim()) return;
    setAdding(true);
    setError("");
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim(), notes: newNotes.trim() || null }),
    });
    if (res.ok) {
      setNewEmail("");
      setNewNotes("");
      load();
    } else {
      const d = await res.json();
      setError(d.error ?? "오류가 발생했습니다.");
    }
    setAdding(false);
  }

  async function handleRemove(email: string) {
    if (!confirm(`${email} 관리자 권한을 해제하시겠습니까?`)) return;
    await fetch(`/api/admin/admins?email=${encodeURIComponent(email)}`, { method: "DELETE" });
    load();
  }

  return (
    <div style={{ padding: "32px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "8px" }}>관리자 설정</h1>
      <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", marginBottom: "24px" }}>
        마스터 관리자만 접근 가능합니다.
      </p>

      {/* Add admin */}
      <div style={{
        background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
        borderRadius: "var(--radius-xl)", padding: "24px", marginBottom: "24px",
      }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>관리자 추가</h2>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="이메일 주소"
            type="email"
            style={{
              flex: "1", minWidth: "200px", padding: "9px 12px",
              border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-md)",
              background: "var(--color-canvas)", fontSize: "0.9rem", color: "var(--color-ink)",
            }}
          />
          <input
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="비고 (선택사항)"
            style={{
              flex: "1", minWidth: "160px", padding: "9px 12px",
              border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-md)",
              background: "var(--color-canvas)", fontSize: "0.9rem", color: "var(--color-ink)",
            }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newEmail.trim()}
            className="btn btn-primary btn-pill"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            추가
          </button>
        </div>
        {error && <p style={{ marginTop: "8px", fontSize: "0.875rem", color: "#DC2626" }}>{error}</p>}
      </div>

      {/* Admin list */}
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-hairline)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>관리자 목록 ({admins.length}명)</h2>
        </div>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--color-muted)" }}>로딩 중...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>이메일</th>
                <th>역할</th>
                <th>임명자</th>
                <th>임명일</th>
                <th>비고</th>
                <th style={{ textAlign: "right" }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.email}>
                  <td style={{ fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{a.email}</td>
                  <td>
                    <span style={{
                      fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius-pill)",
                      background: a.role === "master" ? "var(--color-ink)" : "var(--color-surface-card)",
                      color: a.role === "master" ? "var(--color-canvas)" : "var(--color-muted)",
                      fontWeight: 700, textTransform: "uppercase",
                    }}>{a.role === "master" ? "마스터" : "관리자"}</span>
                  </td>
                  <td style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{a.appointed_by ?? "—"}</td>
                  <td style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                    {a.appointed_at ? new Date(Number(a.appointed_at)).toLocaleDateString("ko-KR") : "하드코딩"}
                  </td>
                  <td style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{a.notes ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    {a.removable ? (
                      <button
                        onClick={() => handleRemove(a.email)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: "#DC2626", fontSize: "0.8rem" }}
                      >해제</button>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", padding: "4px 8px" }}>보호됨</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
