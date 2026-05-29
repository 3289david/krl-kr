"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Report {
  id: number;
  reporter_id: string;
  reporter_email: string;
  target_type: string;
  target_id: string;
  target_value: string | null;
  reason: string;
  status: string;
  action_taken: string | null;
  reviewed_by: string | null;
  reviewed_at: number | null;
  created_at: number;
}

const TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  link:      { label: "단축 링크", color: "#2563eb", icon: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" },
  subdomain: { label: "서브도메인", color: "#7c3aed", icon: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M2 12h20" },
  email:     { label: "이메일", color: "#059669", icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" },
  post:      { label: "게시글", color: "#d97706", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  user:      { label: "사용자", color: "#dc2626", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  content:   { label: "콘텐츠", color: "#6366f1", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" },
};

const ACTION_LABELS: Record<string, string> = {
  dismiss: "무시",
  block_user: "사용자 차단",
  delete_resource: "리소스 삭제",
  community_ban: "커뮤니티 차단",
  warn: "경고",
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending");
  const [pendingCount, setPendingCount] = useState(0);
  const [actionModal, setActionModal] = useState<Report | null>(null);
  const [action, setAction] = useState("dismiss");
  const [actionNote, setActionNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports ?? []);
        setPendingCount(data.pendingCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function handleAction() {
    if (!actionModal) return;
    setProcessing(true);
    try {
      await fetch(`/api/admin/reports/${actionModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, action_note: actionNote }),
      });
      setActionModal(null);
      setActionNote("");
      setAction("dismiss");
      load();
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "12px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>신고 관리</h1>
        {pendingCount > 0 && (
          <span style={{ fontSize: "0.8125rem", background: "#FEF2F2", color: "#DC2626", padding: "4px 12px", borderRadius: "var(--radius-pill)", fontWeight: 700, border: "1px solid #FECACA" }}>
            미처리 {pendingCount}건
          </span>
        )}
      </div>
      <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", marginBottom: "24px" }}>사용자가 제출한 신고를 검토하고 조치를 취하세요</p>

      {/* Status tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", background: "var(--color-lifted)", padding: "4px", borderRadius: "var(--radius-md)", width: "fit-content", border: "1px solid var(--color-hairline)" }}>
        {[
          { key: "pending", label: "대기 중" },
          { key: "reviewed", label: "처리됨" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setStatus(tab.key)} style={{
            padding: "6px 18px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
            fontSize: "0.875rem", fontWeight: 600,
            background: status === tab.key ? "var(--color-canvas)" : "transparent",
            color: status === tab.key ? "var(--color-ink)" : "var(--color-muted)",
            boxShadow: status === tab.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Reports list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--color-muted)", padding: "48px" }}>로딩 중...</p>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px", color: "var(--color-muted)" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: "12px" }}>
              <path d="M3 3l18 18M10.5 10.677a2 2 0 0 0 2.823 2.823M7.362 5.349A7.98 7.98 0 0 1 12 4c4.418 0 8 3.582 8 8a7.98 7.98 0 0 1-1.349 4.638M4.914 4.914A8 8 0 0 0 4 12c0 4.418 3.582 8 8 8a8 8 0 0 0 7.086-4.914" />
            </svg>
            <p style={{ fontWeight: 600, marginBottom: "4px" }}>신고 없음</p>
            <p style={{ fontSize: "0.875rem" }}>{status === "pending" ? "현재 처리 대기 중인 신고가 없습니다." : "처리된 신고가 없습니다."}</p>
          </div>
        ) : reports.map(r => {
          const typeMeta = TYPE_META[r.target_type] ?? { label: r.target_type, color: "#6b7280", icon: "M12 5v14M5 12h14" };
          return (
            <div key={r.id} style={{
              background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
              borderRadius: "var(--radius-lg)", padding: "16px 20px",
              borderLeft: r.status === "pending" ? `3px solid #DC2626` : "3px solid #10b981",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Type + ID */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "5px",
                      fontSize: "0.75rem", fontWeight: 700, padding: "2px 9px", borderRadius: "var(--radius-pill)",
                      background: typeMeta.color + "15", color: typeMeta.color,
                    }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={typeMeta.icon} />
                      </svg>
                      {typeMeta.label}
                    </span>
                    <span style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)", color: "var(--color-muted)" }}>
                      {r.target_value ?? r.target_id}
                    </span>
                    {r.target_type === "link" && (
                      <a href={`https://krl.kr/${r.target_id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "#2563eb", textDecoration: "none" }}>
                        krl.kr/{r.target_id} ↗
                      </a>
                    )}
                  </div>

                  {/* Reason */}
                  <p style={{ fontSize: "0.875rem", lineHeight: 1.55, color: "var(--color-ink)", marginBottom: "8px", fontWeight: 500 }}>
                    <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>사유: </span>
                    {r.reason}
                  </p>

                  {/* Meta */}
                  <div style={{ fontSize: "0.75rem", color: "var(--color-muted)", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <span>신고자: {r.reporter_email}</span>
                    <span>·</span>
                    <span>{new Date(Number(r.created_at)).toLocaleString("ko-KR")}</span>
                    {r.action_taken && (
                      <>
                        <span>·</span>
                        <span style={{ color: "#059669", fontWeight: 600 }}>
                          조치: {ACTION_LABELS[r.action_taken] ?? r.action_taken}
                          {r.reviewed_by ? ` (${r.reviewed_by})` : ""}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {r.status === "pending" && (
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <Link href={`/dashboard/admin/users/${r.reporter_id}`} className="btn btn-ghost btn-sm" style={{ fontSize: "0.8rem" }}>
                      신고자 상세
                    </Link>
                    <button
                      onClick={() => { setActionModal(r); setAction("dismiss"); setActionNote(""); }}
                      className="btn btn-sm"
                      style={{ background: "#DC2626", color: "white", border: "none", fontSize: "0.8rem" }}
                    >
                      조치하기
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
          onClick={() => setActionModal(null)}>
          <div style={{ background: "var(--color-canvas)", borderRadius: "var(--radius-xl)", padding: "28px", width: "460px", maxWidth: "100%" }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "4px" }}>신고 처리</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "20px" }}>
              신고 대상: <strong>{actionModal.target_value ?? actionModal.target_id}</strong>
              <br />사유: {actionModal.reason}
            </p>

            {/* Action selection */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>조치 선택</label>
              {[
                { value: "dismiss", label: "무시 (신고 기각)", desc: "신고를 무시하고 처리 완료로 표시", color: "#6b7280" },
                { value: "warn", label: "경고", desc: "사용자에게 경고 (차단 없음)", color: "#d97706" },
                { value: "delete_resource", label: "리소스 삭제", desc: "신고된 링크/서브도메인/게시글 삭제", color: "#7c3aed" },
                { value: "community_ban", label: "커뮤니티 차단", desc: "사용자 커뮤니티 이용 차단", color: "#f59e0b" },
                { value: "block_user", label: "계정 차단", desc: "신고 대상 사용자 계정 차단 (30일)", color: "#dc2626" },
              ].map(opt => (
                <label key={opt.value} style={{
                  display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px",
                  border: `1.5px solid ${action === opt.value ? opt.color : "var(--color-hairline)"}`,
                  borderRadius: "var(--radius-md)", cursor: "pointer",
                  background: action === opt.value ? opt.color + "08" : "transparent",
                  transition: "all 0.12s",
                }}>
                  <input type="radio" name="action" value={opt.value} checked={action === opt.value}
                    onChange={() => setAction(opt.value)} style={{ marginTop: "2px" }} />
                  <div>
                    <p style={{ fontSize: "0.875rem", fontWeight: 600, color: action === opt.value ? opt.color : "var(--color-ink)" }}>{opt.label}</p>
                    <p style={{ fontSize: "0.775rem", color: "var(--color-muted)" }}>{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Note */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "6px" }}>처리 메모 (선택사항)</label>
              <textarea
                value={actionNote}
                onChange={e => setActionNote(e.target.value)}
                placeholder="처리 사유나 메모를 입력하세요..."
                rows={3}
                style={{
                  width: "100%", padding: "10px", border: "1px solid var(--color-hairline)",
                  borderRadius: "var(--radius-md)", fontSize: "0.875rem",
                  background: "var(--color-lifted)", color: "var(--color-ink)",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setActionModal(null)} className="btn btn-ghost btn-sm">취소</button>
              <button
                onClick={handleAction}
                disabled={processing}
                className="btn btn-sm"
                style={{ background: "#DC2626", color: "white", border: "none" }}
              >
                {processing ? "처리 중..." : "조치 적용"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
