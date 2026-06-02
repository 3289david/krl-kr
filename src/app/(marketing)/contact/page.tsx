import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "문의하기 | KRL.KR",
  description: "KRL.KR 팀에 문의하세요. 버그 신고, 기능 제안, 사업 협력, 기술 지원 등 모든 문의를 받습니다.",
};

const CONTACT_ITEMS = [
  {
    icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    color: "#3b82f6",
    bg: "#EFF6FF",
    title: "이메일",
    value: "contact@krl.kr",
    desc: "일반 문의 및 피드백",
    href: "mailto:contact@krl.kr",
    label: "이메일 보내기",
  },
  {
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    color: "#dc2626",
    bg: "#FEF2F2",
    title: "보안 문의",
    value: "security@krl.kr",
    desc: "취약점 신고 및 보안 이슈",
    href: "mailto:security@krl.kr",
    label: "보안팀 연락",
  },
  {
    icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    color: "#7c3aed",
    bg: "#F5F3FF",
    title: "사업 협력",
    value: "business@krl.kr",
    desc: "파트너십, API 도입, 기업 문의",
    href: "mailto:business@krl.kr",
    label: "협력 문의",
  },
  {
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    color: "#059669",
    bg: "#ECFDF5",
    title: "커뮤니티",
    value: "krl.kr/community",
    desc: "기능 제안, 버그 신고, 자유 토론",
    href: "/community",
    label: "커뮤니티 방문",
  },
];

const FAQ = [
  {
    q: "서비스 이용 중 오류가 발생했어요.",
    a: "커뮤니티 게시판의 '버그/오류 신고' 카테고리에 글을 남겨주시거나, contact@krl.kr로 오류 내용을 보내주세요. 스크린샷이나 오류 메시지를 첨부하면 빠른 해결에 도움이 됩니다.",
  },
  {
    q: "API 키를 잃어버렸어요. 어떻게 재발급하나요?",
    a: "대시보드 → 설정 → API 탭에서 새 키를 발급받을 수 있습니다. 기존 키는 즉시 만료됩니다.",
  },
  {
    q: "URL 단축 한도를 늘릴 수 있나요?",
    a: "현재는 일반 계정에서 월 1,000개의 링크를 생성할 수 있습니다. 더 많은 한도가 필요하신 경우 business@krl.kr로 문의해주세요.",
  },
  {
    q: "내 링크가 차단/삭제되었어요.",
    a: "서비스 약관 위반 또는 신고 누적으로 링크가 차단될 수 있습니다. 정당한 사유가 있다면 대시보드의 '이의제기' 메뉴를 통해 신청해주세요.",
  },
  {
    q: "도메인 서브도메인을 삭제하고 싶어요.",
    a: "대시보드 → 서브도메인 메뉴에서 원하는 서브도메인 우측 삭제 버튼을 클릭하면 즉시 삭제됩니다.",
  },
  {
    q: "개인정보 삭제 요청은 어떻게 하나요?",
    a: "contact@krl.kr로 계정 이메일을 포함해 삭제 요청을 보내주세요. 7영업일 이내에 처리됩니다. 관련 법령에 따라 일부 데이터는 보관 의무가 있을 수 있습니다.",
  },
];

export default function ContactPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--color-canvas)" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "60px 24px 100px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "56px", height: "56px", borderRadius: "16px",
            background: "var(--color-ink)", marginBottom: "20px",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: "12px" }}>
            문의하기
          </h1>
          <p style={{ fontSize: "1.0625rem", color: "var(--color-muted)", maxWidth: "480px", margin: "0 auto", lineHeight: 1.6 }}>
            궁금한 점이나 문제가 있으신가요? 아래 방법으로 연락 주시면 빠르게 도와드리겠습니다.
          </p>
        </div>

        {/* Contact cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "60px" }}>
          {CONTACT_ITEMS.map((item) => (
            <a key={item.title} href={item.href} style={{
              display: "block", padding: "24px",
              background: "var(--color-lifted)",
              border: "1px solid var(--color-hairline)",
              borderRadius: "16px", textDecoration: "none",
              transition: "box-shadow 0.15s ease, transform 0.1s ease",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
            >
              <div style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: "44px", height: "44px", borderRadius: "12px",
                background: item.bg, marginBottom: "14px",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  {item.icon.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
                </svg>
              </div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: item.color, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {item.title}
              </div>
              <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--color-ink)", marginBottom: "6px" }}>
                {item.value}
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginBottom: "14px", lineHeight: 1.5 }}>
                {item.desc}
              </p>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                fontSize: "0.8125rem", fontWeight: 600, color: item.color,
              }}>
                {item.label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </span>
            </a>
          ))}
        </div>

        {/* Response time */}
        <div style={{
          background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
          borderRadius: "16px", padding: "24px 28px", marginBottom: "60px",
          display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
              <strong style={{ color: "var(--color-ink)" }}>평균 응답 시간</strong> — 영업일 기준 24시간 이내
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
              <strong style={{ color: "var(--color-ink)" }}>보안 이슈</strong> — 4시간 이내 초기 응답
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            </svg>
            <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
              <strong style={{ color: "var(--color-ink)" }}>운영 시간</strong> — 연중무휴 모니터링
            </span>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "24px" }}>
            자주 묻는 질문
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {FAQ.map((item, i) => (
              <div key={i} style={{
                background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
                borderRadius: "12px", padding: "20px 24px",
              }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <span style={{
                    flexShrink: 0, width: "24px", height: "24px", borderRadius: "6px",
                    background: "var(--color-ink)", color: "var(--color-canvas)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 700, marginTop: "1px",
                  }}>Q</span>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: "8px", color: "var(--color-ink)" }}>
                      {item.q}
                    </p>
                    <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", lineHeight: 1.65 }}>
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ marginTop: "60px", textAlign: "center", padding: "40px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "20px" }}>
          <p style={{ fontSize: "1rem", color: "var(--color-muted)", marginBottom: "16px" }}>
            커뮤니티에서 다른 사용자들과 소통해보세요
          </p>
          <Link href="/community" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "10px 22px", borderRadius: "10px",
            background: "var(--color-ink)", color: "var(--color-canvas)",
            textDecoration: "none", fontSize: "0.9375rem", fontWeight: 600,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            커뮤니티 방문하기
          </Link>
        </div>

      </div>
    </main>
  );
}
