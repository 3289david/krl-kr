import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "KRL.KR 개인정보처리방침입니다.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "48px" }}>
      <h2
        style={{
          fontSize: "1.125rem",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid var(--color-hairline)",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          color: "var(--color-body)",
          fontSize: "0.9375rem",
          lineHeight: 1.75,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function InfoBox({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div
      style={{
        border: "1px solid var(--color-hairline-strong)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        marginTop: "16px",
        marginBottom: "8px",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          background: "var(--color-surface-card)",
          fontWeight: 600,
          fontSize: "0.875rem",
          borderBottom: "1px solid var(--color-hairline)",
        }}
      >
        {title}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--color-hairline)" : "none" }}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: "10px 16px",
                    background: j === 0 ? "var(--color-lifted)" : "white",
                    fontWeight: j === 0 ? 500 : 400,
                    color: "var(--color-body)",
                    verticalAlign: "top",
                    borderRight: j < row.length - 1 ? "1px solid var(--color-hairline)" : "none",
                    width: j === 0 ? "140px" : "auto",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="section" style={{ paddingTop: "60px" }}>
      <div className="container" style={{ maxWidth: "760px" }}>
        {/* Breadcrumb */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "40px",
            fontSize: "0.875rem",
            color: "var(--color-muted)",
          }}
        >
          <Link href="/" style={{ color: "var(--color-muted)", textDecoration: "none" }}>홈</Link>
          <span>/</span>
          <Link href="/legal" style={{ color: "var(--color-muted)", textDecoration: "none" }}>법적 고지</Link>
          <span>/</span>
          <span style={{ color: "var(--color-ink)" }}>개인정보처리방침</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: "48px" }}>
          <p className="eyebrow" style={{ marginBottom: "12px" }}>법적 고지</p>
          <h1 style={{ fontSize: "2rem", fontWeight: 500, letterSpacing: "-0.02em", marginBottom: "16px" }}>
            개인정보처리방침
          </h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>
            최종 수정일: 2025년 5월 25일 &middot; 시행일: 2025년 5월 25일
          </p>
        </div>

        <div
          style={{
            padding: "20px 24px",
            background: "var(--color-surface-card)",
            borderRadius: "var(--radius-lg)",
            marginBottom: "48px",
            fontSize: "0.9rem",
            color: "var(--color-body)",
            lineHeight: 1.7,
          }}
        >
          <strong>KRL.KR</strong>(이하 &ldquo;회사&rdquo;)는 「개인정보 보호법」(제39조의3) 및 관련 법령에 따라
          이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리하기 위하여
          다음과 같이 개인정보처리방침을 수립·공개합니다.
        </div>

        <Section title="제1조 (개인정보의 처리 목적)">
          <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하는 개인정보는 다음의 목적 이외의 용도로 이용되지 않으며, 이용 목적이 변경될 경우 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
          <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <li><strong>회원 가입 및 관리</strong>: 회원제 서비스 이용에 따른 본인 확인 및 식별, 서비스 이용 계약의 체결 및 이행</li>
            <li><strong>서비스 제공</strong>: URL 단축, 링크 분석, QR 코드 생성 등 서비스 기능 제공</li>
            <li><strong>고객 지원</strong>: 민원 처리, 문의 응대 및 불만 처리</li>
            <li><strong>서비스 개선</strong>: 서비스 이용 통계 분석, 이용자 경험 개선</li>
            <li><strong>보안 및 부정 이용 방지</strong>: 불법·부정 이용 탐지 및 예방</li>
          </ul>
        </Section>

        <Section title="제2조 (처리하는 개인정보의 항목 및 보유 기간)">
          <p>회사는 다음의 개인정보를 수집·이용합니다:</p>

          <InfoBox
            title="회원 가입 시 수집 항목"
            rows={[
              ["필수", "이메일 주소, 비밀번호 (암호화 저장)"],
              ["선택", "이름, 프로필 이미지"],
              ["자동 수집", "접속 IP, 접속 일시, 서비스 이용 기록, 쿠키"],
            ]}
          />

          <InfoBox
            title="링크 클릭 분석 시 수집 항목"
            rows={[
              ["수집 항목", "IP 주소 해시값(원본 미저장), 국가/도시, 디바이스 유형, 브라우저, 운영체제, 유입 경로(Referer)"],
              ["보유 기간", "무료: 30일 / 프로: 1년 / 비즈니스: 무제한"],
              ["법적 근거", "이용자의 동의 (서비스 이용 계약에 포함)"],
            ]}
          />

          <InfoBox
            title="보유 기간"
            rows={[
              ["회원 정보", "회원 탈퇴 후 30일 (분쟁 해결 목적)"],
              ["결제 정보", "5년 (전자상거래법 제6조)"],
              ["접속 로그", "3개월 (통신비밀보호법 제15조의2)"],
              ["민원 처리", "3년 (전자상거래법 제6조)"],
            ]}
          />
        </Section>

        <Section title="제3조 (개인정보의 제3자 제공)">
          <p>
            회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:
          </p>
          <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령에 따라 수사기관의 요청이 있는 경우</li>
            <li>서비스 제공을 위해 반드시 필요한 업무를 수행하는 수탁 업체에 처리를 위탁하는 경우</li>
          </ul>
        </Section>

        <Section title="제4조 (개인정보 처리 위탁)">
          <InfoBox
            title="수탁 업체 현황"
            rows={[
              ["Cloudflare, Inc.", "서버 운영, CDN, 보안 서비스", "탈퇴 또는 위탁 계약 종료 시"],
              ["결제 대행사", "결제 처리 (유료 플랜)", "5년 (전자상거래법)"],
            ]}
          />
          <p>
            회사는 위탁 계약 시 「개인정보 보호법」 제26조에 따라 위탁업무 수행 목적 외 개인정보
            처리 금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자 감독 등 사항을 규정하고,
            이를 준수하는지 관리·감독합니다.
          </p>
        </Section>

        <Section title="제5조 (정보주체의 권리·의무 및 행사 방법)">
          <p>이용자는 회사에 대해 언제든지 다음 각 호의 권리를 행사할 수 있습니다:</p>
          <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <li><strong>개인정보 열람</strong>: 처리 중인 개인정보의 열람 요구</li>
            <li><strong>정정·삭제</strong>: 오류나 불필요한 개인정보의 정정 또는 삭제 요구</li>
            <li><strong>처리 정지</strong>: 개인정보 처리 정지 요구</li>
            <li><strong>동의 철회</strong>: 처리에 대한 동의 철회</li>
          </ul>
          <p>
            권리 행사는 서비스 내 설정 메뉴 또는 이메일(
            <a href="mailto:privacy@krl.kr" style={{ color: "var(--color-ink)" }}>privacy@krl.kr</a>
            )을 통해 요청할 수 있으며, 회사는 요청 접수 후 10일 이내에 처리 결과를 통지합니다.
          </p>
        </Section>

        <Section title="제6조 (개인정보의 파기)">
          <p>
            ① 회사는 개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우에는 지체 없이
            해당 개인정보를 파기합니다.
          </p>
          <p>
            ② 전자적 파일 형태의 경우 복구 불가능한 방법으로 영구 삭제하며, 종이 문서의 경우
            분쇄 또는 소각하여 파기합니다.
          </p>
        </Section>

        <Section title="제7조 (개인정보의 안전성 확보 조치)">
          <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:</p>
          <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <li><strong>기술적 조치</strong>: 데이터 암호화(AES-256), 비밀번호 해시화(PBKDF2), HTTPS 통신, 접근 권한 최소화</li>
            <li><strong>관리적 조치</strong>: 개인정보 취급 담당자 제한, 내부 보안 정책 운영</li>
            <li><strong>물리적 조치</strong>: Cloudflare 데이터센터의 물리적 접근 제어</li>
          </ul>
        </Section>

        <Section title="제8조 (쿠키의 사용)">
          <p>
            ① 회사는 서비스 제공을 위해 쿠키를 사용합니다. 쿠키는 이용자의 웹 브라우저에 저장되는
            소량의 텍스트 파일입니다.
          </p>
          <p>
            ② 사용하는 쿠키의 종류 및 목적:
          </p>
          <InfoBox
            title=""
            rows={[
              ["krl_session", "로그인 세션 유지", "30일 (HttpOnly, Secure)"],
              ["krl_pref", "사용자 설정 저장", "1년"],
            ]}
          />
          <p>
            ③ 이용자는 웹 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다. 단, 쿠키 저장을
            거부할 경우 로그인이 필요한 서비스 이용에 제한이 있을 수 있습니다.
          </p>
        </Section>

        <Section title="제9조 (개인정보 보호책임자)">
          <InfoBox
            title="개인정보 보호책임자"
            rows={[
              ["성명", "KRL.KR 개인정보 보호 담당자"],
              ["이메일", "privacy@krl.kr"],
              ["처리 기간", "요청 접수 후 10일 이내"],
            ]}
          />
          <p>
            이용자는 서비스 이용 중 발생하는 개인정보 관련 불만이나 피해에 대한 신고·상담을
            개인정보 보호책임자에게 문의할 수 있습니다.
          </p>
          <p>
            개인정보 침해에 관한 신고나 상담은 다음 기관에 문의하실 수 있습니다:
          </p>
          <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <li>개인정보보호위원회: 국번 없이 182 / <a href="https://www.privacy.go.kr" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-ink)" }}>www.privacy.go.kr</a></li>
            <li>한국인터넷진흥원: 국번 없이 118 / <a href="https://privacy.kisa.or.kr" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-ink)" }}>privacy.kisa.or.kr</a></li>
            <li>대검찰청 사이버수사과: 국번 없이 1301</li>
            <li>경찰청 사이버안전국: 국번 없이 182</li>
          </ul>
        </Section>

        <Section title="제10조 (개인정보처리방침의 변경)">
          <p>
            본 개인정보처리방침은 법령, 정책 또는 보안 기술의 변경에 따라 수정될 수 있습니다.
            변경 사항이 있는 경우 시행 7일 전에 서비스 공지사항을 통해 공개하겠습니다.
            이용자에게 불리한 변경의 경우에는 시행 30일 전에 공지합니다.
          </p>
          <p>본 방침은 2025년 5월 25일부터 시행됩니다.</p>
        </Section>

        <div
          style={{
            padding: "20px 24px",
            background: "var(--color-surface-card)",
            borderRadius: "var(--radius-lg)",
            fontSize: "0.875rem",
            color: "var(--color-muted)",
            lineHeight: 1.7,
          }}
        >
          <p>
            이 페이지는 「개인정보 보호법」 제30조에 따라 작성된 개인정보처리방침입니다.
            문의: <a href="mailto:privacy@krl.kr" style={{ color: "var(--color-ink)" }}>privacy@krl.kr</a>
          </p>
        </div>
      </div>
    </div>
  );
}
