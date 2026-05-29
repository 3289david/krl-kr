"use client";
import { useState } from "react";

interface ReportModalProps {
  onClose: () => void;
}

const REPORT_TYPES = [
  { value: "link", label: "단축 링크", desc: "악성 URL, 피싱, 스팸 링크", placeholder: "예: krl.kr/abc123 또는 링크 ID" },
  { value: "subdomain", label: "서브도메인", desc: "악성 서브도메인 사이트", placeholder: "예: spam.krl.kr 또는 서브도메인 이름" },
  { value: "email", label: "이메일 별칭", desc: "스팸/피싱 이메일 발신 주소", placeholder: "예: spam@krl.kr 또는 별칭 이름" },
  { value: "post", label: "커뮤니티 게시글", desc: "불법·부적절·스팸 게시글", placeholder: "예: 게시글 URL 또는 제목" },
  { value: "user", label: "사용자", desc: "사기, 사칭, 규정 위반 사용자", placeholder: "예: 사용자 이메일 또는 이름" },
  { value: "content", label: "기타 콘텐츠", desc: "위 항목에 해당하지 않는 기타", placeholder: "신고 대상 설명" },
];

export default function ReportModal({ onClose }: ReportModalProps) {
  const [step, setStep] = useState<"type" | "detail">("type");
  const [targetType, setTargetType] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const selectedType = REPORT_TYPES.find(t => t.value === targetType);

  async function submit() {
    setError("");
    if (!targetValue.trim()) { setError("신고 대상을 입력하세요."); return; }
    if (reason.trim().length < 5) { setError("신고 사유를 5자 이상 입력하세요."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetValue.trim(),
          target_value: targetValue.trim(),
          reason: reason.trim(),
        }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const d = await res.json();
        setError(d.error ?? "오류가 발생했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 500,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }} onClick={onClose}>
      <div style={{
        background: "var(--color-canvas)", borderRadius: "var(--radius-xl)",
        padding: "28px", width: "460px", maxWidth: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        animation: "fadeInUp 0.18s ease",
      }} onClick={e => e.stopPropagation()}>
        <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {done ? (
          /* Success */
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px", color: "#059669" }}>신고 접수 완료</h2>
            <p style={{ fontSize: "0.9rem", color: "var(--color-muted)", lineHeight: 1.6 }}>
              신고가 접수되었습니다. 관리팀이 검토 후 적절한 조치를 취하겠습니다.
            </p>
            <button onClick={onClose} className="btn btn-primary btn-pill" style={{ marginTop: "20px" }}>확인</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>신고하기</h2>
                </div>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                  {step === "type" ? "신고 유형을 선택하세요" : `${selectedType?.label} 신고`}
                </p>
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "4px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {step === "type" ? (
              /* Step 1: Select type */
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {REPORT_TYPES.map(t => (
                  <button key={t.value} onClick={() => { setTargetType(t.value); setStep("detail"); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px",
                      border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-md)",
                      background: "var(--color-lifted)", cursor: "pointer", textAlign: "left",
                      transition: "all 0.12s", fontFamily: "var(--font-sans)",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#DC2626"; (e.currentTarget as HTMLElement).style.background = "#FFF5F5"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-hairline)"; (e.currentTarget as HTMLElement).style.background = "var(--color-lifted)"; }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-ink)", marginBottom: "2px" }}>{t.label}</p>
                      <p style={{ fontSize: "0.775rem", color: "var(--color-muted)" }}>{t.desc}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-muted)", flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                ))}
              </div>
            ) : (
              /* Step 2: Enter details */
              <div>
                <button onClick={() => setStep("type")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "0.8125rem", fontFamily: "var(--font-sans)", marginBottom: "16px", padding: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  유형 다시 선택
                </button>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "6px" }}>
                      신고 대상 <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      value={targetValue}
                      onChange={e => setTargetValue(e.target.value)}
                      placeholder={selectedType?.placeholder ?? "신고 대상을 입력하세요"}
                      style={{
                        width: "100%", padding: "10px 12px",
                        border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-md)",
                        fontSize: "0.9rem", background: "var(--color-lifted)", color: "var(--color-ink)",
                      }}
                    />
                    <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "4px" }}>
                      링크 URL, 서브도메인 이름, 이메일 주소, 게시글 제목 등을 입력하세요
                    </p>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "6px" }}>
                      신고 사유 <span style={{ color: "#DC2626" }}>*</span>
                      <span style={{ fontWeight: 400, color: "var(--color-muted)" }}> (최소 5자)</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="신고 사유를 구체적으로 작성해주세요. 어떤 문제가 있는지, 피해 상황 등을 설명해 주시면 더 빠른 처리에 도움이 됩니다."
                      rows={5}
                      style={{
                        width: "100%", padding: "10px 12px",
                        border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-md)",
                        fontSize: "0.875rem", background: "var(--color-lifted)", color: "var(--color-ink)",
                        resize: "vertical", lineHeight: 1.55,
                      }}
                    />
                    <p style={{ fontSize: "0.75rem", color: reason.length >= 5 ? "#059669" : "var(--color-muted)", marginTop: "4px" }}>
                      {reason.length}자 입력
                    </p>
                  </div>

                  {error && (
                    <p style={{ fontSize: "0.875rem", color: "#DC2626", background: "#FEF2F2", padding: "10px 12px", borderRadius: "var(--radius-md)" }}>
                      {error}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button onClick={onClose} className="btn btn-ghost btn-sm">취소</button>
                    <button
                      onClick={submit}
                      disabled={submitting || reason.trim().length < 5 || !targetValue.trim()}
                      className="btn btn-sm"
                      style={{ background: "#DC2626", color: "white", border: "none" }}
                    >
                      {submitting ? "제출 중..." : "신고 제출"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
