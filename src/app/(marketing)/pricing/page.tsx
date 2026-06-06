import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "요금제 | KRL.KR",
  description: "KRL.KR Pro/VIP 플랜으로 더 많은 기능을 이용하세요. 웹 호스팅, Drive, AI 이미지 생성 등.",
};

// Update these to your actual BMC membership URLs
const BMC_MEMBERSHIP = "https://buymeacoffee.com/rukkitofficial/membership";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "무료",
    period: "",
    priceKrw: null,
    description: "개인 사용자를 위한 기본 플랜",
    color: "#1a1714",
    accentBg: "transparent",
    features: [
      { text: "URL 단축 무제한" },
      { text: "QR 코드 생성" },
      { text: "서브도메인 (4자 이상)" },
      { text: "파일 공유 (100MB/파일)" },
      { text: "이메일 수신함 1개" },
      { text: "통합 저장공간 5GB (Drive + Blog)" },
      { text: "KRL Blog 1개 · 기본 테마 5종" },
      { text: "웹 호스팅 1개 사이트 (500MB)" },
      { text: "AI 채팅 20회/일" },
      { text: "Link-in-Bio 프로필" },
      { text: "커뮤니티 참여" },
    ],
    cta: "무료로 시작하기",
    ctaHref: "/register",
    ctaExternal: false,
    highlight: false,
    badge: null,
  },
  {
    id: "pro",
    name: "Pro",
    price: "₩9,900",
    period: "/월",
    priceKrw: 9900,
    description: "개인 크리에이터와 개발자를 위한 플랜",
    color: "#2563eb",
    accentBg: "#eff6ff",
    features: [
      { text: "Free 플랜의 모든 기능" },
      { text: "통합 저장공간 20GB (Drive + Blog)", bold: true },
      { text: "KRL Blog 5개 · 프리미엄 테마 · 예약 발행", bold: true },
      { text: "블로그 AI (제목·태그·SEO·맞춤법)", bold: true },
      { text: "웹 호스팅 5개 사이트 (3GB/사이트)" },
      { text: "AI 채팅 500회/일", bold: true },
      { text: "AI 이미지 생성 50장/일", bold: true },
      { text: "서브도메인 제한 없음 (1자~)" },
      { text: "파일 공유 (500MB/파일)" },
      { text: "추가 저장공간 구매 가능 (10GB/₩2,900)" },
      { text: "우선 지원" },
    ],
    cta: "Pro 구독하기",
    ctaHref: BMC_MEMBERSHIP,
    ctaExternal: true,
    highlight: true,
    badge: "가장 인기",
  },
  {
    id: "vip",
    name: "VIP",
    price: "₩29,900",
    period: "/월",
    priceKrw: 29900,
    description: "팀과 전문가를 위한 최상위 플랜",
    color: "#7c3aed",
    accentBg: "#f5f3ff",
    features: [
      { text: "Pro 플랜의 모든 기능" },
      { text: "통합 저장공간 100GB (Drive + Blog)", bold: true },
      { text: "KRL Blog 무제한 · 커스텀 CSS · 팀 블로그", bold: true },
      { text: "정적 사이트 내보내기 → KRL Hosting 배포", bold: true },
      { text: "웹 호스팅 무제한 (10GB/사이트)" },
      { text: "AI 채팅 무제한", bold: true },
      { text: "AI 이미지 생성 200장/일 (고화질)", bold: true },
      { text: "추가 저장공간 구매 가능 (10GB/₩2,900)" },
      { text: "우선 지원 (빠른 응답)" },
      { text: "베타 기능 조기 접근" },
    ],
    cta: "VIP 구독하기",
    ctaHref: BMC_MEMBERSHIP,
    ctaExternal: true,
    highlight: false,
    badge: "최상위",
  },
];

const COMPARE_ROWS = [
  { label: "URL 단축", free: "무제한", pro: "무제한", vip: "무제한" },
  { label: "QR 코드", free: "무제한", pro: "무제한", vip: "무제한" },
  { label: "서브도메인", free: "4자 이상", pro: "제한 없음", vip: "제한 없음" },
  { label: "통합 저장공간¹", free: "5GB", pro: "20GB", vip: "100GB" },
  { label: "KRL Blog", free: "1개 · 기본테마", pro: "5개 · 프리미엄테마", vip: "무제한 · 커스텀CSS" },
  { label: "블로그 AI", free: "—", pro: "제목·태그·SEO·맞춤법", vip: "무제한" },
  { label: "웹 호스팅", free: "1개 (500MB)", pro: "5개 (3GB/사이트)", vip: "무제한 (10GB/사이트)" },
  { label: "AI 채팅", free: "20회/일", pro: "500회/일", vip: "무제한" },
  { label: "AI 이미지 생성", free: "불가", pro: "50장/일", vip: "200장/일 (고화질)" },
  { label: "파일 공유 용량", free: "100MB/파일", pro: "500MB/파일", vip: "500MB/파일" },
  { label: "추가 저장공간", free: "—", pro: "10GB/₩2,900", vip: "10GB/₩2,900" },
  { label: "지원", free: "커뮤니티", pro: "우선 지원", vip: "우선 + 빠른 응답" },
];

function CheckSvg({ color = "#16a34a" }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function BmcLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.107.405 2.06.674 4.428 1.02 6.577.088.396-.167.738-.41 1.023-.754.129-.15.205-.336.186-.539-.015-.148-.073-.32-.124-.464-.114-.33-.343-.607-.629-.78a2.93 2.93 0 00-.423-.199c-.674-.233-1.499-.208-2.183.021-.173.057-.32.171-.516.116-.17-.049-.29-.178-.33-.349a.557.557 0 01.06-.39c.181-.305.534-.499.876-.621.636-.225 1.335-.303 2.01-.302.667 0 1.365.063 1.994.296.464.17.917.47 1.093.948.12.33.07.706-.13.992-.177.25-.438.42-.712.527l-.023.009c.49.1.974.24 1.366.556.462.372.682.946.706 1.535.025.617-.207 1.295-.628 1.736C15.8 11.416 14.645 11.882 13.5 12c-1.131.114-2.294.035-3.387-.277a7.88 7.88 0 01-1.567-.655c-.415-.235-.804-.52-1.057-.935-.2-.326-.32-.721-.268-1.1.038-.27.16-.539.34-.748.222-.26.543-.414.882-.444.366-.03.74.063 1.066.224.328.164.577.425.836.668.507.47 1.044.91 1.67 1.204.621.293 1.316.416 1.988.299.346-.06.69-.2.963-.425.346-.285.552-.73.48-1.16-.072-.422-.392-.77-.768-.952a3.04 3.04 0 00-.634-.194c-.49-.096-.99-.05-1.473.065-.163.039-.312.105-.476.134a.637.637 0 01-.47-.094.605.605 0 01-.223-.41c-.028-.208.07-.407.226-.539.296-.248.693-.336 1.064-.383.707-.09 1.44-.04 2.135.108.673.143 1.347.404 1.842.905.477.484.72 1.16.68 1.835-.037.65-.32 1.294-.79 1.74-.932.888-2.272 1.116-3.508 1.102-1.18-.013-2.352-.26-3.413-.748a9.046 9.046 0 01-1.498-.877 5.64 5.64 0 01-1.163-1.159c-.342-.478-.545-1.038-.575-1.605a3.39 3.39 0 01.397-1.77c.323-.573.834-1.031 1.415-1.315.606-.296 1.28-.433 1.947-.482a9.92 9.92 0 012.038.048 9.46 9.46 0 011.974.468c.604.224 1.178.555 1.603 1.043.453.52.677 1.218.618 1.891z"/>
    </svg>
  );
}

export default function PricingPage() {
  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "var(--color-canvas)", minHeight: "100vh", paddingBottom: 80 }}>
      <style>{`
        .plan-card { background: var(--color-surface); border: 1.5px solid var(--color-hairline); border-radius: 20px; padding: 32px 28px; display: flex; flex-direction: column; transition: box-shadow 0.2s; }
        .plan-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
        .plan-card.highlight { border: 2px solid #2563eb; box-shadow: 0 0 0 4px #2563eb14; }
        .plan-card.highlight:hover { box-shadow: 0 0 0 4px #2563eb20, 0 8px 32px rgba(37,99,235,0.15); }
        .plan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: start; }
        @media (max-width: 900px) { .plan-grid { grid-template-columns: 1fr; max-width: 480px; margin: 0 auto; } }
        .feature-item { display: flex; align-items: flex-start; gap: 10px; padding: 5px 0; font-size: 0.9rem; }
        .compare-table { width: 100%; border-collapse: collapse; }
        .compare-table th, .compare-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--color-hairline); font-size: 0.875rem; }
        .compare-table th { font-weight: 600; background: var(--color-canvas); position: sticky; top: 0; }
        .compare-table td:not(:first-child), .compare-table th:not(:first-child) { text-align: center; }
        .cta-btn { display: block; text-align: center; padding: 13px 20px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 0.9375rem; transition: opacity 0.15s, transform 0.1s; cursor: pointer; }
        .cta-btn:hover { opacity: 0.87; transform: translateY(-1px); }
        .cta-btn:active { transform: translateY(0); }
        .step-num { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8125rem; flex-shrink: 0; }
        .faq-item { padding: 20px; background: var(--color-surface); border-radius: 12px; border: 1px solid var(--color-hairline); margin-bottom: 12px; }
      `}</style>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "72px 24px 48px", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#fef9c3", color: "#854d0e", padding: "5px 14px", borderRadius: 9999, fontSize: "0.8125rem", fontWeight: 700, marginBottom: 20, border: "1px solid #fde68a" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          BuyMeACoffee 멤버십으로 즉시 결제
        </div>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
          나에게 맞는 플랜을 선택하세요
        </h1>
        <p style={{ fontSize: "1.0625rem", color: "var(--color-muted)", lineHeight: 1.6, margin: 0 }}>
          기본 기능은 영원히 무료.<br />더 강력한 AI와 더 많은 호스팅이 필요하면 업그레이드하세요.
        </p>
      </div>

      {/* Plan cards */}
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>
        <div className="plan-grid">
          {PLANS.map(plan => (
            <div key={plan.id} className={`plan-card${plan.highlight ? " highlight" : ""}`} style={{ position: "relative" }}>
              {plan.badge && (
                <div style={{
                  position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                  background: plan.id === "vip" ? "#7c3aed" : "#2563eb",
                  color: "#fff", fontSize: "0.7rem", fontWeight: 800,
                  padding: "4px 14px", borderRadius: 9999, whiteSpace: "nowrap", letterSpacing: "0.04em",
                }}>
                  {plan.badge}
                </div>
              )}

              <div>
                <div style={{ fontWeight: 800, fontSize: "1.375rem", color: plan.color }}>{plan.name}</div>
                <div style={{ color: "var(--color-muted)", fontSize: "0.875rem", marginTop: 4 }}>{plan.description}</div>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "20px 0 4px" }}>
                <span style={{ fontSize: "2.375rem", fontWeight: 800, letterSpacing: "-0.04em" }}>{plan.price}</span>
                {plan.period && <span style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>{plan.period}</span>}
              </div>
              {plan.priceKrw && (
                <div style={{ color: "var(--color-muted)", fontSize: "0.8rem", marginBottom: 16 }}>
                  약 ${(plan.priceKrw / 1350).toFixed(2)} USD · 카드/PayPal 결제 가능
                </div>
              )}
              {!plan.priceKrw && <div style={{ marginBottom: 16 }} />}

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
                {plan.features.map((f, i) => (
                  <li key={i} className="feature-item">
                    <CheckSvg color={plan.id === "free" ? "#16a34a" : plan.color} />
                    <span style={{ lineHeight: 1.4, fontWeight: f.bold ? 600 : 400 }}>{f.text}</span>
                  </li>
                ))}
              </ul>

              {plan.ctaExternal ? (
                <a
                  href={plan.ctaHref}
                  target="_blank"
                  rel="noreferrer"
                  className="cta-btn"
                  style={{
                    background: plan.highlight ? plan.color : plan.id === "vip" ? plan.color : "transparent",
                    border: `2px solid ${plan.color}`,
                    color: (plan.highlight || plan.id === "vip") ? "#fff" : plan.color,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/>
                    </svg>
                    {plan.cta}
                  </span>
                </a>
              ) : (
                <Link
                  href={plan.ctaHref}
                  className="cta-btn"
                  style={{
                    background: "var(--color-ink)",
                    border: "2px solid var(--color-ink)",
                    color: "var(--color-canvas)",
                  }}
                >
                  {plan.cta}
                </Link>
              )}

              {plan.id !== "free" && (
                <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--color-muted)", marginTop: 10, lineHeight: 1.5 }}>
                  결제 시 가입한 이메일로 자동 활성화
                </p>
              )}
            </div>
          ))}
        </div>

        {/* How it works */}
        <div style={{ marginTop: 56, padding: "32px 28px", background: "var(--color-surface)", borderRadius: 20, border: "1px solid var(--color-hairline)" }}>
          <h3 style={{ fontWeight: 800, marginBottom: 28, fontSize: "1.25rem", textAlign: "center", letterSpacing: "-0.02em" }}>
            업그레이드 방법
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
            {[
              {
                num: "1",
                color: "#2563eb",
                title: "BMC에서 구독",
                desc: "아래 버튼으로 BuyMeACoffee 멤버십 페이지에서 Pro 또는 VIP를 선택하고 결제합니다.",
              },
              {
                num: "2",
                color: "#16a34a",
                title: "자동 감지",
                desc: "결제 완료 즉시 KRL.KR에 웹훅이 전달되어 계정이 자동으로 업그레이드됩니다.",
              },
              {
                num: "3",
                color: "#7c3aed",
                title: "즉시 사용",
                desc: "새로운 기능이 바로 활성화됩니다. KRL.KR 가입 이메일과 BMC 결제 이메일이 동일해야 합니다.",
              },
            ].map((s) => (
              <div key={s.num} style={{ display: "flex", gap: 14 }}>
                <div className="step-num" style={{ background: s.color, color: "#fff", marginTop: 2 }}>{s.num}</div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: "0.9375rem" }}>{s.title}</div>
                  <div style={{ color: "var(--color-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--color-hairline)" }}>
            <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>
              BuyMeACoffee 결제 시 <strong>KRL.KR 가입 이메일과 동일한 이메일</strong>을 사용해야 자동 활성화됩니다.
            </p>
          </div>
        </div>

        {/* Direct payment buttons */}
        <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <a
            href={BMC_MEMBERSHIP}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "18px 24px", borderRadius: 14,
              background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
              color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: "1rem",
              boxShadow: "0 4px 20px #2563eb30",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/>
            </svg>
            Pro 구독하기 — ₩9,900/월
          </a>
          <a
            href={BMC_MEMBERSHIP}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "18px 24px", borderRadius: 14,
              background: "linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)",
              color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: "1rem",
              boxShadow: "0 4px 20px #7c3aed30",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            VIP 구독하기 — ₩29,900/월
          </a>
        </div>

        {/* Comparison table */}
        <div style={{ marginTop: 72 }}>
          <h2 style={{ fontSize: "1.625rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 24, textAlign: "center" }}>상세 비교</h2>
          <div style={{ background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-hairline)", overflow: "hidden", overflowX: "auto" }}>
            <table className="compare-table">
              <thead>
                <tr>
                  <th style={{ width: "35%" }}>기능</th>
                  <th>Free</th>
                  <th style={{ color: "#2563eb" }}>Pro</th>
                  <th style={{ color: "#7c3aed" }}>VIP</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{row.label}</td>
                    <td><span style={{ color: "var(--color-muted)" }}>{row.free}</span></td>
                    <td style={{ color: "#2563eb", fontWeight: 500 }}>{row.pro}</td>
                    <td style={{ color: "#7c3aed", fontWeight: 500 }}>{row.vip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Storage footnote */}
        <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "var(--color-muted)", marginTop: 12 }}>
          ¹ 통합 저장공간은 KRL Drive + KRL Blog 이미지 합산 기준. 웹 호스팅·파일 공유는 별도.
        </p>

        {/* Extra storage purchase banner */}
        <div style={{ marginTop: 40, maxWidth: 600, margin: "40px auto 0", padding: "24px 28px", background: "linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)", borderRadius: 16, border: "2px solid #fde68a", textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>☕</div>
          <h3 style={{ fontWeight: 800, fontSize: "1.125rem", marginBottom: 6, color: "#92400e" }}>저장공간이 더 필요하신가요?</h3>
          <p style={{ fontSize: "0.9375rem", color: "#b45309", marginBottom: 16, lineHeight: 1.5 }}>
            10GB 추가 저장공간 — <strong>₩2,900/월</strong><br />
            Drive + Blog 통합 적용 · 결제 즉시 자동 반영
          </p>
          <a
            href="https://buymeacoffee.com/rukkitofficial/e/545645"
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 10, background: "#FFDD00", color: "#1a1714", fontSize: "1rem", fontWeight: 800, textDecoration: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
          >
            ☕ BuyMeACoffee에서 10GB 추가 구매
          </a>
          <p style={{ fontSize: "0.8125rem", color: "#92400e", marginTop: 12, opacity: 0.8 }}>
            BMC 결제 이메일 = KRL.KR 가입 이메일 이어야 자동 반영됩니다
          </p>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 72, maxWidth: 680, margin: "72px auto 0" }}>
          <h2 style={{ fontSize: "1.625rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 24, textAlign: "center" }}>자주 묻는 질문</h2>
          {[
            {
              q: "무료 플랜은 얼마나 오래 유지되나요?",
              a: "영원히 무료입니다. 기본 기능은 제한 없이 사용하실 수 있습니다.",
            },
            {
              q: "결제 방법은 무엇인가요?",
              a: "BuyMeACoffee를 통해 결제합니다. 신용카드, 직불카드, PayPal 등 다양한 방법을 지원합니다.",
            },
            {
              q: "결제 후 언제 활성화되나요?",
              a: "BuyMeACoffee 결제 즉시 웹훅으로 자동 활성화됩니다. 단, BMC 결제에 사용한 이메일과 KRL.KR 가입 이메일이 동일해야 합니다.",
            },
            {
              q: "언제든 취소할 수 있나요?",
              a: "네, BuyMeACoffee 대시보드에서 언제든 구독을 취소할 수 있습니다. 취소 후 남은 기간은 계속 사용 가능하며, 기간 만료 후 Free로 자동 다운그레이드됩니다.",
            },
            {
              q: "웹 호스팅에서 어떤 프레임워크를 지원하나요?",
              a: "정적 파일을 생성하는 모든 프레임워크를 지원합니다. React (Vite/CRA), Next.js (static export), Vue, Svelte, Astro 등. 빌드 결과물(dist/ 또는 out/ 폴더)을 ZIP으로 압축해 업로드하세요.",
            },
            {
              q: "AI 모델은 어떻게 다른가요?",
              a: "Free는 Pollinations AI를 사용합니다. Pro는 OpenAI GPT-5, VIP는 GPT-5 Pro를 사용하여 더 정확하고 빠른 응답을 제공합니다. 이미지 생성도 VIP는 고화질(flux-pro) 모델이 적용됩니다.",
            },
            {
              q: "KRL Blog는 어떤 서비스인가요?",
              a: "slug.krl.kr 형태의 개인 블로그를 만들 수 있는 서비스입니다. Markdown 에디터, 코드 블록, 댓글, RSS, Open Graph 자동 생성을 지원합니다. Pro 이상에서는 예약 발행, AI 글쓰기 도우미(제목 추천·태그·SEO·맞춤법 교정), 프리미엄 테마를 사용할 수 있습니다.",
            },
            {
              q: "추가 저장공간은 어떻게 구매하나요?",
              a: "누구나 10GB 단위로 추가 저장공간을 구매할 수 있습니다 (₩2,900/10GB/월). 아래 버튼 또는 buymeacoffee.com/rukkitofficial/e/545645 에서 구매 후 자동으로 Drive + Blog 통합 저장공간에 추가됩니다. BMC 결제 이메일과 KRL.KR 가입 이메일이 동일해야 합니다.",
            },
          ].map((faq, i) => (
            <div key={i} className="faq-item">
              <h4 style={{ fontWeight: 700, marginBottom: 8, fontSize: "0.9375rem" }}>{faq.q}</h4>
              <p style={{ color: "var(--color-muted)", margin: 0, fontSize: "0.9375rem", lineHeight: 1.6 }}>{faq.a}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: "center", marginTop: 64, padding: "52px 24px", background: "linear-gradient(135deg, #1a1714 0%, #2d2520 100%)", borderRadius: 20 }}>
          <h2 style={{ fontSize: "1.875rem", fontWeight: 800, color: "#f4f0e6", letterSpacing: "-0.02em", marginBottom: 10 }}>지금 시작하세요</h2>
          <p style={{ color: "rgba(244,240,230,0.55)", fontSize: "1rem", marginBottom: 32 }}>무료로 시작하고, 필요할 때 업그레이드하세요.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/register" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 28px", background: "#f4f0e6", color: "#1a1714",
              borderRadius: 10, fontWeight: 700, textDecoration: "none", fontSize: "0.9375rem",
            }}>
              무료로 시작하기
            </a>
            <a href={BMC_MEMBERSHIP} target="_blank" rel="noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 28px", background: "#2563eb", color: "#fff",
              borderRadius: 10, fontWeight: 700, textDecoration: "none", fontSize: "0.9375rem",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/>
              </svg>
              Pro/VIP 구독하기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
