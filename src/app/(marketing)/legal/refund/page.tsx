import Link from "next/link";

export default function RefundPolicyPage() {
  return (
    <main>
      <section className="section">
        <div className="container" style={{ maxWidth: "720px" }}>
          <div style={{ marginBottom: "48px" }}>
            <p className="eyebrow" style={{ marginBottom: "16px" }}>법적 고지</p>
            <h1 style={{ marginBottom: "16px" }}>환불 정책</h1>
            <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>
              시행일: 2025년 1월 1일 &nbsp;|&nbsp; 최종 수정일: 2025년 1월 1일
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "40px", lineHeight: 1.8, color: "var(--color-body)" }}>

            <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px 28px" }}>
              <p style={{ fontWeight: 700, marginBottom: "8px" }}>요약</p>
              <p style={{ color: "var(--color-muted)" }}>
                결제 후 <strong style={{ color: "var(--color-body)" }}>7일 이내</strong>에 요청하신 경우, 사유 없이 전액 환불해 드립니다.
                7일 이후에는 미사용 기간에 대한 부분 환불을 검토합니다.
              </p>
            </div>

            <section>
              <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>1. 적용 범위</h2>
              <p>
                본 환불 정책은 KRL.KR의 유료 구독 서비스(프로 플랜, 비즈니스 플랜)에 적용됩니다.
                무료 플랜 사용자에게는 해당되지 않습니다.
              </p>
            </section>

            <section>
              <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>2. 7일 환불 보장</h2>
              <p style={{ marginBottom: "16px" }}>
                KRL.KR은 고객 만족을 위해 결제일로부터 7일 이내에 환불을 요청하시면 조건 없이 전액 환불해 드립니다.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  "환불 신청은 support@krl.kr로 이메일을 보내주세요.",
                  "이메일에 결제에 사용한 이메일 주소와 환불 사유(선택)를 기재해주세요.",
                  "영업일 기준 2~3일 이내에 환불 처리가 완료됩니다.",
                  "환불 금액은 결제에 사용한 원래 결제 수단으로 돌려드립니다.",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0, marginTop: "2px" }}>
                      {i + 1}
                    </span>
                    <p style={{ fontSize: "0.9375rem" }}>{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>3. 7일 이후 환불</h2>
              <p style={{ marginBottom: "16px" }}>
                구독 시작 후 7일이 경과한 경우, 다음 기준에 따라 부분 환불을 검토합니다:
              </p>
              <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-hairline-strong)" }}>
                      {["경과 기간", "환불 금액"].map((h) => (
                        <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { period: "결제 후 7일 이내", refund: "100% 전액 환불" },
                      { period: "결제 후 8~14일", refund: "50% 부분 환불 (사례별 검토)" },
                      { period: "결제 후 15일 이후", refund: "원칙적으로 환불 불가, 예외적 검토 가능" },
                    ].map((row, i) => (
                      <tr key={row.period} style={{ borderBottom: i < 2 ? "1px solid var(--color-hairline)" : "none" }}>
                        <td style={{ padding: "14px 20px", fontSize: "0.9375rem" }}>{row.period}</td>
                        <td style={{ padding: "14px 20px", fontSize: "0.9375rem", color: "var(--color-muted)" }}>{row.refund}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>4. 환불 불가 항목</h2>
              <p style={{ marginBottom: "16px" }}>다음의 경우에는 환불이 제공되지 않습니다:</p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", paddingLeft: 0 }}>
                {[
                  "이용약관 위반으로 인한 계정 정지 또는 해지",
                  "서비스를 충분히 이용한 후(과도한 API 호출, 대용량 파일 업로드 등) 제출된 환불 요청",
                  "단순 변심으로 7일이 경과한 후 요청된 환불",
                  "제3자를 통해 구매한 구독(해당 판매자의 정책 적용)",
                ].map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.9375rem", color: "var(--color-body)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "3px" }}>
                      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>5. 구독 취소</h2>
              <p style={{ marginBottom: "12px" }}>
                구독을 취소하면 현재 청구 기간이 끝날 때까지 프로/비즈니스 기능을 계속 이용하실 수 있습니다.
                취소 후에는 자동으로 무료 플랜으로 전환됩니다.
              </p>
              <p>
                구독 취소는 대시보드 &gt; 설정 &gt; 플랜 관리에서 직접 하시거나, support@krl.kr로 요청하실 수 있습니다.
              </p>
            </section>

            <section>
              <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>6. 결제 처리</h2>
              <p>
                KRL.KR의 결제는 보안 결제 대행사를 통해 처리됩니다.
                환불 처리 후 실제 계좌/카드에 반영되는 데에는 카드사 또는 은행 정책에 따라
                영업일 기준 3~7일이 소요될 수 있습니다.
              </p>
            </section>

            <section>
              <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>7. 서비스 장애로 인한 환불</h2>
              <p>
                KRL.KR의 귀책으로 인한 서비스 장애(연속 24시간 이상 중단)가 발생한 경우,
                해당 기간에 비례한 서비스 크레딧 또는 부분 환불을 제공합니다.
                장애 현황은{" "}
                <Link href="/status" style={{ color: "var(--color-ink)" }}>서비스 현황 페이지</Link>
                에서 확인하실 수 있습니다.
              </p>
            </section>

            <section>
              <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>8. 문의</h2>
              <p>환불 관련 문의 및 신청은 아래로 연락해주세요:</p>
              <div style={{ marginTop: "16px", padding: "20px 24px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)" }}>
                <p style={{ fontWeight: 600, marginBottom: "4px" }}>고객 지원 이메일</p>
                <a href="mailto:support@krl.kr" style={{ color: "var(--color-ink)", fontFamily: "var(--font-mono)" }}>support@krl.kr</a>
                <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", marginTop: "8px" }}>영업일 기준 24시간 이내 답변 드립니다.</p>
              </div>
            </section>

          </div>

          <div style={{ marginTop: "48px", paddingTop: "32px", borderTop: "1px solid var(--color-hairline)", display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <Link href="/legal/terms" style={{ color: "var(--color-muted)", fontSize: "0.9rem", textDecoration: "none" }}>이용약관</Link>
            <Link href="/legal/privacy" style={{ color: "var(--color-muted)", fontSize: "0.9rem", textDecoration: "none" }}>개인정보처리방침</Link>
            <Link href="/legal/cookies" style={{ color: "var(--color-muted)", fontSize: "0.9rem", textDecoration: "none" }}>쿠키 정책</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
