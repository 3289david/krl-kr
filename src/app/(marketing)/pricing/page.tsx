import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "요금제 | KRL.KR",
  description: "KRL.KR Pro/VIP 플랜으로 더 많은 기능을 이용하세요. 웹 호스팅, Drive, AI 이미지 생성 등.",
};

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "무료",
    period: "",
    description: "개인 사용자를 위한 기본 플랜",
    color: "#1a1714",
    features: [
      "URL 단축 무제한",
      "QR 코드 생성",
      "서브도메인 (4자 이상)",
      "파일 공유 (100MB/파일)",
      "이메일 수신함 (1개)",
      "KRL Drive 5GB",
      "웹 호스팅 1개 사이트 (500MB)",
      "AI 채팅 (Claude Haiku)",
      "Link-in-Bio 프로필",
      "커뮤니티 참여",
    ],
    cta: "무료로 시작하기",
    ctaHref: "/register",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "₩9,900",
    period: "/월",
    description: "개인 크리에이터와 개발자를 위한 플랜",
    color: "#2563eb",
    features: [
      "Free 플랜의 모든 기능",
      "KRL Drive 20GB",
      "웹 호스팅 5개 사이트 (사이트당 3GB)",
      "AI 채팅 업그레이드 (Claude Sonnet)",
      "AI 이미지 생성 (DALL-E 3, 월 200장)",
      "서브도메인 제한 없음 (1자~)",
      "파일 공유 (500MB/파일)",
      "우선 지원",
      "추후 추가 기능 우선 제공",
    ],
    cta: "Pro 시작하기",
    ctaHref: "https://www.buymeacoffee.com/krlkr/membership",
    highlight: true,
  },
  {
    id: "vip",
    name: "VIP",
    price: "₩29,900",
    period: "/월",
    description: "팀과 전문가를 위한 최상위 플랜",
    color: "#7c3aed",
    features: [
      "Pro 플랜의 모든 기능",
      "KRL Drive 100GB",
      "웹 호스팅 무제한 사이트 (사이트당 10GB)",
      "AI 채팅 최고급 (Claude Opus)",
      "AI 이미지 생성 (DALL-E 3 HD, 월 1000장)",
      "우선 지원 (빠른 응답)",
      "커스텀 기능 요청",
      "베타 기능 조기 접근",
    ],
    cta: "VIP 시작하기",
    ctaHref: "https://www.buymeacoffee.com/krlkr/membership",
    highlight: false,
  },
];

const COMPARE_ROWS = [
  { label: "URL 단축", free: "무제한", pro: "무제한", vip: "무제한" },
  { label: "QR 코드", free: "무제한", pro: "무제한", vip: "무제한" },
  { label: "서브도메인", free: "4자 이상", pro: "제한 없음", vip: "제한 없음" },
  { label: "KRL Drive", free: "5GB", pro: "20GB", vip: "100GB" },
  { label: "웹 호스팅 사이트", free: "1개 (500MB)", pro: "5개 (3GB/사이트)", vip: "무제한 (10GB/사이트)" },
  { label: "AI 채팅 모델", free: "Claude Haiku", pro: "Claude Sonnet", vip: "Claude Opus" },
  { label: "AI 이미지 생성", free: "불가", pro: "200장/월", vip: "1,000장/월" },
  { label: "파일 공유 용량", free: "100MB/파일", pro: "500MB/파일", vip: "500MB/파일" },
  { label: "지원", free: "커뮤니티", pro: "우선 지원", vip: "우선 + 빠른 응답" },
];

function CheckSvg({ color = "#16a34a" }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CrossSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "var(--color-canvas)", minHeight: "100vh", paddingBottom: 80 }}>
      <style>{`
        .plan-card { background: var(--color-surface); border: 1px solid var(--color-hairline); border-radius: 20px; padding: 32px 28px; display: flex; flex-direction: column; }
        .plan-card.highlight { border: 2px solid #2563eb; box-shadow: 0 0 0 4px #2563eb18; }
        .plan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 768px) { .plan-grid { grid-template-columns: 1fr; } }
        .feature-item { display: flex; align-items: flex-start; gap: 10px; padding: 5px 0; font-size: 0.9rem; }
        .compare-table { width: 100%; border-collapse: collapse; }
        .compare-table th, .compare-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--color-hairline); font-size: 0.875rem; }
        .compare-table th { font-weight: 600; background: var(--color-canvas); }
        .compare-table td:not(:first-child) { text-align: center; }
        .compare-table th:not(:first-child) { text-align: center; }
      `}</style>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "72px 24px 48px", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eff6ff", color: "#1d4ed8", padding: "4px 14px", borderRadius: 9999, fontSize: "0.8125rem", fontWeight: 600, marginBottom: 20 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          BuyMeACoffee Membership
        </div>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
          나에게 맞는 플랜을 선택하세요
        </h1>
        <p style={{ fontSize: "1.0625rem", color: "var(--color-muted)", lineHeight: 1.6, margin: 0 }}>
          기본 기능은 영원히 무료. 더 많은 저장공간, 더 강력한 AI, 더 많은 호스팅이 필요하다면 Pro 또는 VIP로 업그레이드하세요.
        </p>
      </div>

      {/* Plan cards */}
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>
        <div className="plan-grid">
          {PLANS.map(plan => (
            <div key={plan.id} className={`plan-card${plan.highlight ? " highlight" : ""}`} style={{ position: "relative" }}>
              {plan.highlight && (
                <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#2563eb", color: "#fff", fontSize: "0.75rem", fontWeight: 700, padding: "3px 14px", borderRadius: 9999, whiteSpace: "nowrap" }}>
                  가장 인기
                </div>
              )}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 800, fontSize: "1.375rem", color: plan.color }}>{plan.name}</div>
                <div style={{ color: "var(--color-muted)", fontSize: "0.875rem", marginTop: 4 }}>{plan.description}</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "20px 0" }}>
                <span style={{ fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.03em" }}>{plan.price}</span>
                {plan.period && <span style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>{plan.period}</span>}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", flex: 1 }}>
                {plan.features.map((f, i) => (
                  <li key={i} className="feature-item">
                    <CheckSvg color={plan.color} />
                    <span style={{ lineHeight: 1.4 }}>{f}</span>
                  </li>
                ))}
              </ul>
              <a href={plan.ctaHref} target={plan.ctaHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
                style={{
                  display: "block", textAlign: "center", padding: "12px 20px", borderRadius: 10,
                  background: plan.highlight ? plan.color : "transparent",
                  border: `2px solid ${plan.id === "free" ? "var(--color-hairline)" : plan.color}`,
                  color: plan.highlight ? "#fff" : plan.color,
                  fontWeight: 700, textDecoration: "none", fontSize: "0.9375rem", transition: "opacity 0.15s",
                }}>
                {plan.cta}
              </a>
              {plan.id !== "free" && (
                <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--color-muted)", marginTop: 10 }}>
                  BuyMeACoffee 멤버십 후 <Link href="/dashboard/settings" style={{ color: "var(--color-ink)" }}>이메일 인증</Link>
                </p>
              )}
            </div>
          ))}
        </div>

        {/* BMC verification guide */}
        <div style={{ marginTop: 48, padding: 28, background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-hairline)" }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: "1.0625rem", display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
            업그레이드 방법
          </h3>
          <ol style={{ paddingLeft: 20, margin: 0, lineHeight: 2, color: "var(--color-ink)", fontSize: "0.9375rem" }}>
            <li><a href="https://www.buymeacoffee.com/krlkr/membership" target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: 600 }}>BuyMeACoffee 멤버십</a>에서 원하는 플랜을 구독합니다.</li>
            <li>KRL.KR에 로그인 후 <Link href="/dashboard/settings" style={{ color: "#2563eb", fontWeight: 600 }}>설정 페이지</Link>에서 BMC 이메일을 입력합니다.</li>
            <li>관리자가 확인 후 24시간 이내에 플랜을 활성화합니다.</li>
          </ol>
        </div>

        {/* Comparison table */}
        <div style={{ marginTop: 64 }}>
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
                    <td>
                      {row.free === "불가" ? (
                        <div style={{ display: "flex", justifyContent: "center" }}><CrossSvg /></div>
                      ) : (
                        <span style={{ color: "var(--color-muted)" }}>{row.free}</span>
                      )}
                    </td>
                    <td style={{ color: "#2563eb", fontWeight: 500 }}>{row.pro}</td>
                    <td style={{ color: "#7c3aed", fontWeight: 500 }}>{row.vip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 64, maxWidth: 640, margin: "64px auto 0" }}>
          <h2 style={{ fontSize: "1.625rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 28, textAlign: "center" }}>자주 묻는 질문</h2>
          {[
            { q: "무료 플랜은 얼마나 오래 유지되나요?", a: "영원히 무료입니다. 기본 기능에 제한 없이 사용하실 수 있습니다." },
            { q: "결제 방법은 무엇인가요?", a: "BuyMeACoffee 멤버십을 통해 결제합니다. 카드, PayPal 등 다양한 방법을 지원합니다." },
            { q: "언제든 취소할 수 있나요?", a: "네, BuyMeACoffee에서 언제든 구독을 취소할 수 있습니다. 취소 후 남은 기간은 계속 사용 가능합니다." },
            { q: "업그레이드 후 언제 활성화되나요?", a: "BMC 이메일 인증 후 24시간 이내에 수동으로 확인 및 활성화합니다." },
            { q: "웹 호스팅에서 어떤 프레임워크를 지원하나요?", a: "정적 파일을 생성하는 모든 프레임워크를 지원합니다. React (CRA/Vite), Next.js (static export), Vue, Svelte, Astro 등." },
          ].map((faq, i) => (
            <div key={i} style={{ marginBottom: 20, padding: 20, background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-hairline)" }}>
              <h4 style={{ fontWeight: 700, marginBottom: 8, fontSize: "0.9375rem" }}>{faq.q}</h4>
              <p style={{ color: "var(--color-muted)", margin: 0, fontSize: "0.9375rem", lineHeight: 1.6 }}>{faq.a}</p>
            </div>
          ))}
        </div>

        {/* CTA bottom */}
        <div style={{ textAlign: "center", marginTop: 64, padding: "48px 24px", background: "linear-gradient(135deg, #1a1714 0%, #2d2520 100%)", borderRadius: 20 }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f4f0e6", letterSpacing: "-0.02em", marginBottom: 12 }}>지금 시작하세요</h2>
          <p style={{ color: "rgba(244,240,230,0.6)", fontSize: "1rem", marginBottom: 28 }}>무료로 시작하고, 필요할 때 업그레이드하세요.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/register" style={{ display: "inline-block", padding: "12px 28px", background: "#f4f0e6", color: "#1a1714", borderRadius: 10, fontWeight: 700, textDecoration: "none", fontSize: "0.9375rem" }}>
              무료로 시작하기
            </a>
            <a href="https://www.buymeacoffee.com/krlkr/membership" target="_blank" rel="noreferrer"
              style={{ display: "inline-block", padding: "12px 28px", background: "transparent", color: "#f4f0e6", border: "2px solid rgba(244,240,230,0.3)", borderRadius: 10, fontWeight: 700, textDecoration: "none", fontSize: "0.9375rem" }}>
              Pro 플랜 보기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
