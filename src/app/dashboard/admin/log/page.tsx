"use client";
import { useState, useEffect } from "react";

interface LogRow {
  id: number; admin_email: string; action: string;
  target_type: string | null; target_id: string | null;
  target_email: string | null; details: string | null; created_at: number;
}

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  block_user:       { label: "사용자 차단",     color: "#DC2626" },
  unblock_user:     { label: "차단 해제",       color: "#059669" },
  delete_account:   { label: "계정 삭제",       color: "#DC2626" },
  community_ban:    { label: "커뮤니티 차단",   color: "#D97706" },
  community_unban:  { label: "커뮤 해제",       color: "#059669" },
  delete_link:      { label: "링크 삭제",       color: "#6366f1" },
  delete_email:     { label: "이메일 삭제",     color: "#6366f1" },
  delete_subdomain: { label: "서브도메인 삭제", color: "#6366f1" },
  create_notice:    { label: "공지 작성",       color: "#0284c7" },
  create_meeting:   { label: "회의 개설",       color: "#0284c7" },
  appeal_approved:  { label: "이의제기 승인",   color: "#059669" },
  appeal_rejected:  { label: "이의제기 거부",   color: "#DC2626" },
};

export default function AdminLogPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/log")
      .then(r => r.ok ? r.json() : { logs: [] })
      .then(d => { setLogs(d.logs ?? []); setLoading(false); });
  }, []);

  return (
    <div style={{ padding: "32px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "8px" }}>활동 로그</h1>
      <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", marginBottom: "24px" }}>모든 관리자 활동 내역</p>

      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        {loading ? (
          <p style={{ padding: "48px", textAlign: "center", color: "var(--color-muted)" }}>로딩 중...</p>
        ) : logs.length === 0 ? (
          <p style={{ padding: "48px", textAlign: "center", color: "var(--color-muted)" }}>로그 없음</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>시간</th><th>관리자</th><th>행동</th><th>대상</th><th>상세</th></tr></thead>
            <tbody>
              {logs.map(l => {
                const meta = ACTION_LABEL[l.action];
                return (
                  <tr key={l.id}>
                    <td style={{ fontSize: "0.8125rem", color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                      {new Date(Number(l.created_at)).toLocaleString("ko-KR")}
                    </td>
                    <td style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>{l.admin_email}</td>
                    <td>
                      <span style={{
                        fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius-pill)", fontWeight: 600,
                        background: (meta?.color ?? "var(--color-muted)") + "18",
                        color: meta?.color ?? "var(--color-muted)",
                      }}>{meta?.label ?? l.action}</span>
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                      {l.target_email ?? l.target_id ?? "—"}
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--color-muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.details ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
