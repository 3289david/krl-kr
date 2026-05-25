import Link from "next/link";
import {
  LinkIcon, BarChartIcon, QrCodeIcon, GlobeIcon, SmartphoneIcon,
  UserIcon, FileIcon, CodeIcon, WebhookIcon, KeyIcon, ShieldIcon, ZapIcon, ClockIcon
} from "@/components/icons";

const features = [
  {
    icon: <LinkIcon size={22} />,
    title: "URL 단축",
    desc: "커스텀 슬러그, 만료 일시, 비밀번호 보호, 클릭 제한까지. 링크의 모든 것을 제어하세요.",
    details: ["커스텀 슬러그 설정", "만료 날짜/시간 설정", "비밀번호 보호", "최대 클릭 수 제한", "UTM 파라미터 자동 추가"],
  },
  {
    icon: <BarChartIcon size={22} />,
    title: "실시간 분석",
    desc: "국가, 디바이스, 브라우저, 유입 경로별 클릭 데이터를 실시간으로 확인하세요.",
    details: ["국가/지역별 클릭 분포", "디바이스 타입 분석", "브라우저 통계", "유입 경로 추적", "일별/주별/월별 차트"],
  },
  {
    icon: <QrCodeIcon size={22} />,
    title: "QR 코드",
    desc: "SVG, PNG 형식의 커스터마이즈 가능한 QR 코드를 즉시 생성하세요.",
    details: ["SVG/PNG 다운로드", "전경색/배경색 커스터마이즈", "오류 수정 레벨 설정", "다이나믹 QR (목적지 변경)", "로고 삽입"],
  },
  {
    icon: <GlobeIcon size={22} />,
    title: "서브도메인 서비스",
    desc: "*.krl.kr 서브도메인을 등록하고 GitHub Pages, Vercel, HTML 페이지로 연결하세요.",
    details: ["최소 4자 서브도메인", "GitHub Pages 연결", "Vercel 연결", "HTML 직접 호스팅", "리다이렉트 설정"],
  },
  {
    icon: <ZapIcon size={22} />,
    title: "다이나믹 링크",
    desc: "QR 코드를 다시 만들지 않고 목적지 URL을 변경할 수 있습니다.",
    details: ["실시간 목적지 변경", "QR 코드 재생성 불필요", "캠페인 관리 최적화", "A/B 테스트 지원"],
  },
  {
    icon: <UserIcon size={22} />,
    title: "Link-in-bio",
    desc: "인스타그램, 틱톡용 단일 페이지에 모든 링크를 모아두세요.",
    details: ["커스텀 @사용자명", "링크 추가/제거/재정렬", "소셜 아이콘", "테마 선택 (기본/다크/미니멀)", "조회수 통계"],
  },
  {
    icon: <FileIcon size={22} />,
    title: "파일 공유",
    desc: "파일을 업로드하고 공유 링크를 받으세요. 만료, 다운로드 제한을 설정할 수 있습니다.",
    details: ["드래그앤드롭 업로드", "익명 100MB / 로그인 1GB", "만료 날짜 설정", "최대 다운로드 횟수", "비밀번호 보호"],
  },
  {
    icon: <CodeIcon size={22} />,
    title: "Pastebin",
    desc: "코드와 텍스트를 공유하세요. 14개 언어의 구문 강조를 지원합니다.",
    details: ["14개 언어 지원", "공개/비공개 설정", "만료 설정", "비밀번호 보호", "조회수 통계"],
  },
  {
    icon: <WebhookIcon size={22} />,
    title: "웹훅 인스펙터",
    desc: "HTTP 요청을 실시간으로 캡처하고 헤더, 본문을 검사하세요.",
    details: ["모든 HTTP 메서드 지원", "실시간 요청 스트림", "헤더/본문 검사", "7일 보관", "공유 URL"],
  },
  {
    icon: <KeyIcon size={22} />,
    title: "REST API",
    desc: "모든 기능을 API로 자동화하세요. 개발자 친화적인 설계.",
    details: ["Bearer 토큰 인증", "권한 기반 API 키", "Rate Limiting", "JSON 응답", "API 문서 제공"],
  },
  {
    icon: <SmartphoneIcon size={22} />,
    title: "앱 링크",
    desc: "iOS, Android를 감지하여 각 플랫폼에 맞는 URL로 리다이렉트하세요.",
    details: ["iOS URL 설정", "Android URL 설정", "기본 URL (폴백)", "디바이스 자동 감지"],
  },
  {
    icon: <ShieldIcon size={22} />,
    title: "Edge 리다이렉트 규칙",
    desc: "국가 또는 디바이스 타입에 따라 다른 URL로 리다이렉트하세요.",
    details: ["국가 기반 규칙", "디바이스 기반 규칙", "JSON 형식 설정", "우선순위 지정"],
  },
  {
    icon: <ClockIcon size={22} />,
    title: "임시 링크",
    desc: "특정 시간 또는 클릭 횟수 후 자동으로 만료되는 링크를 만드세요.",
    details: ["날짜/시간 만료", "클릭 횟수 만료", "만료 후 자동 비활성화", "만료 알림"],
  },
];

export default function FeaturesPage() {
  return (
    <main>
      <section className="section" style={{ paddingBottom: "48px" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto" }}>
            <p className="eyebrow" style={{ justifyContent: "center", marginBottom: "24px" }}>기능</p>
            <h1 style={{ marginBottom: "20px" }}>링크 관리의 모든 것</h1>
            <p style={{ fontSize: "1.125rem", color: "var(--color-muted)", marginBottom: "40px" }}>
              KRL.KR은 단순한 URL 단축기가 아닙니다. 완전한 링크 인프라를 제공합니다.
            </p>
            <Link href="/register" className="btn btn-primary btn-lg btn-pill" style={{ textDecoration: "none" }}>
              무료로 시작하기
            </Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: "48px" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
            {features.map((feature) => (
              <div key={feature.title} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "28px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "var(--radius-sm)", background: "var(--color-surface-card)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-ink)", marginBottom: "16px" }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "10px" }}>{feature.title}</h3>
                <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", lineHeight: 1.6, marginBottom: "16px" }}>{feature.desc}</p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {feature.details.map((d) => (
                    <li key={d} style={{ fontSize: "0.875rem", color: "var(--color-body)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ paddingTop: "48px" }}>
        <div className="container">
          <div style={{ background: "var(--color-ink)", borderRadius: "var(--radius-xl)", padding: "64px", textAlign: "center" }}>
            <h2 style={{ color: "var(--color-canvas)", marginBottom: "16px" }}>지금 무료로 시작하세요</h2>
            <p style={{ color: "rgba(243,240,238,0.6)", fontSize: "1.0625rem", marginBottom: "32px" }}>
              신용카드 불필요. 무료 플랜으로 즉시 시작하세요.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/register" className="btn btn-lg btn-pill" style={{ textDecoration: "none", background: "var(--color-canvas)", color: "var(--color-ink)" }}>
                무료 계정 만들기
              </Link>
              <Link href="/pricing" className="btn btn-lg btn-pill btn-ghost" style={{ textDecoration: "none", color: "var(--color-canvas)", border: "1px solid rgba(255,255,255,0.2)" }}>
                요금제 보기
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
