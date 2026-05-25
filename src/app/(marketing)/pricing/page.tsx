import Link from "next/link";

const plans = [
  {
    name: "무료",
    price: "₩0",
    period: "영구",
    desc: "개인 프로젝트와 간단한 링크 관리에 적합합니다.",
    features: [
      "월 50개 링크 생성",
      "기본 클릭 분석",
      "QR 코드 생성",
      "7일 데이터 보관",
      "API 접근 (100 req/일)",
      "파일 공유 (100MB/건)",
      "Pastebin 기능",
      "웹훅 인스펙터",
    ],
    notIncluded: ["커스텀 서브도메인", "이메일 별칭", "고급 분석 (90일)", "우선 지원"],
    cta: "무료로 시작",
    ctaHref: "/register",
    featured: false,
  },
  {
    name: "프로",
    price: "₩9,900",
    period: "월",
    desc: "마케터, 크리에이터, 소규모 팀을 위한 완전한 링크 플랫폼.",
    features: [
      "무제한 링크 생성",
      "고급 분석 (90일 보관)",
      "QR 코드 (커스텀, 다이나믹)",
      "서브도메인 3개 (*.krl.kr)",
      "이메일 별칭 5개 (@krl.kr)",
      "API 접근 (10,000 req/일)",
      "파일 공유 (1GB/건)",
      "비밀번호/만료/클릭 제한",
      "앱 링크 (iOS/Android)",
      "우선 이메일 지원",
    ],
    notIncluded: [],
    cta: "프로 시작하기",
    ctaHref: "/register?plan=pro",
    featured: true,
  },
  {
    name: "비즈니스",
    price: "₩29,900",
    period: "월",
    desc: "팀과 기업을 위한 엔터프라이즈급 링크 관리 솔루션.",
    features: [
      "프로 플랜의 모든 기능",
      "무제한 분석 (365일)",
      "서브도메인 20개",
      "이메일 별칭 50개",
      "API 접근 (무제한)",
      "팀 멤버 초대",
      "전용 서버 (예약)",
      "SLA 99.99% 보장",
      "전화/이메일 전담 지원",
      "커스텀 요구사항 지원",
    ],
    notIncluded: [],
    cta: "문의하기",
    ctaHref: "mailto:contact@rukkit.net",
    featured: false,
  },
];

const comparison = [
  { feature: "링크 생성", free: "월 50개", pro: "무제한", business: "무제한" },
  { feature: "분석 보관", free: "7일", pro: "90일", business: "365일" },
  { feature: "QR 코드", free: "기본", pro: "커스텀/다이나믹", business: "커스텀/다이나믹" },
  { feature: "서브도메인", free: "없음", pro: "3개", business: "20개" },
  { feature: "이메일 별칭", free: "없음", pro: "5개", business: "50개" },
  { feature: "API 요청/일", free: "100", pro: "10,000", business: "무제한" },
  { feature: "파일 크기 제한", free: "100MB", pro: "1GB", business: "5GB" },
  { feature: "비밀번호 보호", free: true, pro: true, business: true },
  { feature: "앱 링크", free: false, pro: true, business: true },
  { feature: "팀 멤버", free: "1명", pro: "1명", business: "무제한" },
];

const faqs = [
  { q: "무료 플랜은 언제까지 사용할 수 있나요?", a: "무료 플랜은 영구적으로 제공됩니다. 신용카드 없이 바로 시작하실 수 있습니다." },
  { q: "프로 플랜으로 업그레이드하면 바로 기능이 활성화되나요?", a: "네, 결제 즉시 모든 프로 기능이 활성화됩니다." },
  { q: "환불 정책은 어떻게 되나요?", a: "결제 후 7일 이내에는 전액 환불이 가능합니다. 환불 정책 페이지를 확인해주세요." },
  { q: "기존 무료 플랜 링크들은 어떻게 되나요?", a: "업그레이드 후에도 기존에 생성한 모든 링크는 정상적으로 유지됩니다." },
  { q: "API 키는 어떻게 발급받나요?", a: "대시보드 > API 키 메뉴에서 권한별로 API 키를 발급받을 수 있습니다." },
  { q: "서브도메인 설정은 얼마나 걸리나요?", a: "등록 즉시 DNS 레코드가 생성되며, 전파까지 최대 24시간이 소요될 수 있습니다." },
];

export default function PricingPage() {
  return (
    <main>
      <section className="section" style={{ paddingBottom: "48px" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
            <p className="eyebrow" style={{ justifyContent: "center", marginBottom: "24px" }}>요금제</p>
            <h1 style={{ marginBottom: "20px" }}>단순하고 투명한 가격</h1>
            <p style={{ fontSize: "1.125rem", color: "var(--color-muted)" }}>
              숨겨진 비용 없음. 언제든지 취소 가능.
            </p>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section style={{ paddingBottom: "96px" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", alignItems: "start" }}>
            {plans.map((plan) => (
              <div key={plan.name} className={plan.featured ? "price-card price-card-featured" : "price-card"}>
                {plan.featured && (
                  <div style={{ marginBottom: "16px" }}>
                    <span className="badge" style={{ background: "rgba(243,243,238,0.15)", color: "var(--color-canvas)", border: "none", fontSize: "0.75rem" }}>
                      인기
                    </span>
                  </div>
                )}
                <p className="eyebrow" style={{ marginBottom: "12px" }}>{plan.name}</p>
                <div style={{ marginBottom: "16px" }}>
                  <span style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-0.03em", color: plan.featured ? "var(--color-canvas)" : "var(--color-ink)" }}>
                    {plan.price}
                  </span>
                  {plan.period !== "영구" && (
                    <span style={{ fontSize: "1rem", color: plan.featured ? "rgba(243,240,238,0.6)" : "var(--color-muted)", marginLeft: "4px" }}>
                      /{plan.period}
                    </span>
                  )}
                </div>
                <p style={{ color: plan.featured ? "rgba(243,240,238,0.7)" : "var(--color-muted)", marginBottom: "28px", fontSize: "0.9375rem" }}>
                  {plan.desc}
                </p>
                <Link
                  href={plan.ctaHref}
                  className={`btn btn-lg btn-pill ${plan.featured ? "" : "btn-primary"}`}
                  style={{
                    width: "100%", justifyContent: "center", textDecoration: "none", marginBottom: "28px",
                    ...(plan.featured ? { background: "var(--color-canvas)", color: "var(--color-ink)" } : {}),
                  }}
                >
                  {plan.cta}
                </Link>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {plan.features.map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={plan.featured ? "var(--color-canvas)" : "var(--color-success)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      <span style={{ fontSize: "0.9375rem", color: plan.featured ? "rgba(243,240,238,0.85)" : "var(--color-body)" }}>{f}</span>
                    </div>
                  ))}
                  {plan.notIncluded.map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px", opacity: 0.4 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
                        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                      </svg>
                      <span style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="section" style={{ background: "var(--color-lifted)", paddingTop: "80px", paddingBottom: "80px" }}>
        <div className="container">
          <h2 style={{ textAlign: "center", marginBottom: "48px" }}>기능 비교</h2>
          <div style={{ background: "white", borderRadius: "var(--radius-xl)", overflow: "hidden", border: "1px solid var(--color-hairline)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-hairline-strong)" }}>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "0.8125rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-muted)" }}>기능</th>
                  {["무료", "프로", "비즈니스"].map((p) => (
                    <th key={p} style={{ padding: "16px 24px", textAlign: "center", fontSize: "0.8125rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-muted)" }}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <tr key={row.feature} style={{ borderBottom: i < comparison.length - 1 ? "1px solid var(--color-hairline)" : "none" }}>
                    <td style={{ padding: "14px 24px", fontSize: "0.9375rem", color: "var(--color-body)", fontWeight: 500 }}>{row.feature}</td>
                    {["free", "pro", "business"].map((plan) => {
                      const val = row[plan as keyof typeof row];
                      return (
                        <td key={plan} style={{ padding: "14px 24px", textAlign: "center" }}>
                          {typeof val === "boolean" ? (
                            val ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-ash)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                              </svg>
                            )
                          ) : (
                            <span style={{ fontSize: "0.9375rem", color: "var(--color-body)" }}>{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 style={{ textAlign: "center", marginBottom: "48px" }}>자주 묻는 질문</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {faqs.map((faq) => (
              <div key={faq.q} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px 28px" }}>
                <p style={{ fontWeight: 600, marginBottom: "8px", fontSize: "1rem" }}>{faq.q}</p>
                <p style={{ color: "var(--color-muted)", lineHeight: 1.6 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
