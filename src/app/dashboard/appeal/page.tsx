"use client";
import { useState, useEffect } from "react";

export default function AppealPage() {
  const [reason, setReason] = useState("");
  const [blockType, setBlockType] = useState("full");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [existing, setExisting] = useState<{ status: string; created_at: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 기존 이의제기 확인 (사용자의 pending 이의제기)
    fetch("/api/admin/users/me/appeals")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.appeal) setExisting(d.appeal);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    if (reason.trim().length < 10) {
      setError("이의제기 사유를 10자 이상 입력해주세요.");
      return;
    }
    setError("");
    const res = await fetch("/api/admin/appeals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim(), block_type: blockType }),
    });
    if (res.ok) {
      setSubmitted(true);
    } else {
      const d = await res.json();
      setError(d.error ?? "오류가 발생했습니다.");
    }
  }

  if (loading) return <div style={{ padding: "48px", textAlign: "center", color: "var(--color-muted)" }}>로딩 중...</div>;

  return (
    <div style={{ padding: "32px", maxWidth: "560px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "8px" }}>차단 이의제기</h1>
      <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", marginBottom: "28px", lineHeight: 1.6 }}>
        계정 또는 커뮤니티 차단에 대해 이의를 제기할 수 있습니다. 관리팀이 검토 후 응답드립니다.
      </p>

      {submitted ? (
        <div style={{ background: "#05966910", border: "1px solid #05966940", borderRadius: "var(--radius-xl)", padding: "28px", textAlign: "center" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px", display: "block" }}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h2 style={{ fontWeight: 700, color: "#059669", marginBottom: "8px" }}>이의제기 제출 완료</h2>
          <p style={{ fontSize: "0.9rem", color: "var(--color-muted)" }}>관리팀이 빠른 시일 내에 검토 후 연락드리겠습니다.</p>
        </div>
      ) : existing ? (
        <div style={{ background: "#D9770610", border: "1px solid #D9770640", borderRadius: "var(--radius-xl)", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4 M12 16h.01" />
            </svg>
            <span style={{ fontWeight: 700, color: "#D97706" }}>이의제기 검토 중</span>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
            제출일: {new Date(Number(existing.created_at)).toLocaleDateString("ko-KR")}<br />
            이미 제출된 이의제기가 검토 중입니다. 결과를 기다려주세요.
          </p>
        </div>
      ) : (
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px" }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "8px" }}>차단 유형</label>
            <div style={{ display: "flex", gap: "10px" }}>
              {[["full", "계정 차단"], ["community", "커뮤니티 차단"]].map(([v, l]) => (
                <label key={v} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.875rem" }}>
                  <input type="radio" name="blockType" value={v} checked={blockType === v} onChange={() => setBlockType(v)} />
                  {l}
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "8px" }}>
              이의제기 사유 <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>(최소 10자)</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="차단에 동의하지 않는 이유를 자세히 작성해주세요..."
              rows={6}
              style={{
                width: "100%", padding: "12px", border: "1px solid var(--color-hairline)",
                borderRadius: "var(--radius-md)", fontSize: "0.9rem",
                background: "var(--color-canvas)", color: "var(--color-ink)",
                resize: "vertical", lineHeight: 1.6,
              }}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "4px" }}>
              현재 {reason.length}자 / 최소 10자
            </p>
          </div>
          {error && <p style={{ fontSize: "0.875rem", color: "#DC2626", marginBottom: "12px" }}>{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={reason.trim().length < 10}
            className="btn btn-primary btn-pill"
            style={{ width: "100%" }}
          >
            이의제기 제출
          </button>
        </div>
      )}
    </div>
  );
}
