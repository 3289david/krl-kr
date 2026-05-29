"use client";
import { useState, useEffect } from "react";

interface Appeal {
  id: number; user_id: string; email: string; block_type: string;
  reason: string; status: string; admin_response: string | null;
  reviewed_by: string | null; reviewed_at: number | null;
  created_at: number; user_name: string | null;
}

export default function AdminAppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appeal | null>(null);
  const [response, setResponse] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/appeals?status=${tab}`);
    if (res.ok) {
      const data = await res.json();
      setAppeals(data.appeals ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [tab]);

  async function handleReview(status: "approved" | "rejected") {
    if (!selected) return;
    await fetch(`/api/admin/appeals/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, admin_response: response }),
    });
    setSelected(null);
    setResponse("");
    load();
  }

  const tabStyle = (t: string) => ({
    padding: "8px 16px", border: "none", background: "transparent",
    cursor: "pointer", fontSize: "0.875rem", fontWeight: 600,
    color: tab === t ? "var(--color-ink)" : "var(--color-muted)",
    borderBottom: tab === t ? "2px solid var(--color-ink)" : "2px solid transparent",
  });

  return (
    <div style={{ padding: "32px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "8px" }}>이의제기 관리</h1>
      <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", marginBottom: "24px" }}>사용자가 제출한 차단 이의제기를 검토합니다.</p>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--color-hairline)", marginBottom: "24px" }}>
        {(["pending", "approved", "rejected"] as const).map(t => (
          <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
            {{ pending: "검토 중", approved: "승인됨", rejected: "거부됨" }[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: "center", padding: "48px", color: "var(--color-muted)" }}>로딩 중...</p>
      ) : appeals.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--color-muted)" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, margin: "0 auto 12px", display: "block" }}>
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4 M12 16h.01" />
          </svg>
          <p>{tab === "pending" ? "검토할 이의제기가 없습니다." : "내역이 없습니다."}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {appeals.map(a => (
            <div key={a.id} style={{
              background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
              borderRadius: "var(--radius-lg)", padding: "18px 20px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{a.user_name ?? a.email}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}>{a.email}</span>
                    <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", background: "var(--color-surface-card)", color: "var(--color-muted)", fontWeight: 600 }}>
                      {a.block_type === "full" ? "전체 차단" : "커뮤니티 차단"}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.875rem", color: "var(--color-ink)", marginBottom: "6px", lineHeight: 1.5 }}>{a.reason}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
                    제출: {new Date(Number(a.created_at)).toLocaleString("ko-KR")}
                    {a.reviewed_by && ` · 검토: ${a.reviewed_by}`}
                  </p>
                  {a.admin_response && (
                    <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginTop: "8px", padding: "8px 12px", background: "var(--color-surface-card)", borderRadius: "var(--radius-md)", fontStyle: "italic" }}>
                      관리자 응답: {a.admin_response}
                    </p>
                  )}
                </div>
                {tab === "pending" && (
                  <button
                    onClick={() => setSelected(a)}
                    className="btn btn-primary btn-sm btn-pill"
                    style={{ flexShrink: 0 }}
                  >검토</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} onClick={() => setSelected(null)}>
          <div style={{ background: "var(--color-canvas)", borderRadius: "var(--radius-xl)", padding: "28px", width: "440px", maxWidth: "100%" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "6px" }}>이의제기 검토</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "14px" }}>{selected.email}</p>
            <div style={{ padding: "12px 14px", background: "var(--color-lifted)", borderRadius: "var(--radius-md)", marginBottom: "14px" }}>
              <p style={{ fontSize: "0.875rem", lineHeight: 1.55 }}>{selected.reason}</p>
            </div>
            <textarea
              placeholder="관리자 응답 (선택사항)"
              value={response}
              onChange={e => setResponse(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: "10px", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", background: "var(--color-lifted)", color: "var(--color-ink)", resize: "vertical", marginBottom: "16px" }}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm">취소</button>
              <button onClick={() => handleReview("rejected")} className="btn btn-sm" style={{ background: "#DC2626", color: "white", border: "none" }}>거부</button>
              <button onClick={() => handleReview("approved")} className="btn btn-sm" style={{ background: "#059669", color: "white", border: "none" }}>승인 (차단 해제)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
