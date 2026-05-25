import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관",
  description: "KRL.KR 서비스 이용약관입니다.",
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

export default function TermsPage() {
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
          <Link href="/" style={{ color: "var(--color-muted)", textDecoration: "none" }}>
            홈
          </Link>
          <span>/</span>
          <Link href="/legal" style={{ color: "var(--color-muted)", textDecoration: "none" }}>
            법적 고지
          </Link>
          <span>/</span>
          <span style={{ color: "var(--color-ink)" }}>이용약관</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: "48px" }}>
          <p className="eyebrow" style={{ marginBottom: "12px" }}>법적 고지</p>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              marginBottom: "16px",
            }}
          >
            이용약관
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
          <strong>KRL.KR</strong>(이하 &ldquo;서비스&rdquo;)를 이용하시기 전에 본 이용약관을 주의 깊게 읽어주시기 바랍니다.
          서비스를 이용함으로써 본 약관에 동의하는 것으로 간주됩니다. 약관에 동의하지 않으시면
          서비스를 이용하실 수 없습니다.
        </div>

        <Section title="제1조 (목적)">
          <p>
            본 약관은 KRL.KR(이하 &ldquo;회사&rdquo; 또는 &ldquo;서비스&rdquo;)가 제공하는 URL 단축, 링크 분석, QR 코드 생성,
            서브도메인 서비스, 파일 공유 및 기타 관련 서비스(이하 &ldquo;서비스&rdquo;)의 이용과 관련하여
            회사와 이용자 간의 권리, 의무 및 책임사항 등을 규정함을 목적으로 합니다.
          </p>
        </Section>

        <Section title="제2조 (정의)">
          <p>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
          <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <li>
              <strong>&ldquo;서비스&rdquo;</strong>: KRL.KR이 제공하는 URL 단축, 분석, QR 코드 생성,
              서브도메인 및 기타 디지털 도구 서비스 일체
            </li>
            <li>
              <strong>&ldquo;이용자&rdquo;</strong>: 본 약관에 따라 서비스를 이용하는 개인 또는 법인
            </li>
            <li>
              <strong>&ldquo;회원&rdquo;</strong>: 서비스에 가입하여 계정을 생성한 이용자
            </li>
            <li>
              <strong>&ldquo;단축 링크&rdquo;</strong>: 서비스를 통해 생성된 단축된 URL
            </li>
            <li>
              <strong>&ldquo;콘텐츠&rdquo;</strong>: 이용자가 서비스를 통해 생성하거나 공유하는 모든 정보
            </li>
          </ul>
        </Section>

        <Section title="제3조 (약관의 게시와 개정)">
          <p>
            ① 회사는 본 약관을 서비스 초기 화면 또는 연결 화면에 게시합니다.
          </p>
          <p>
            ② 회사는 「전자상거래 등에서의 소비자 보호에 관한 법률」, 「약관의 규제에 관한 법률」,
            「정보통신망 이용촉진 및 정보보호 등에 관한 법률」(이하 &ldquo;정보통신망법&rdquo;) 등 관련 법령을
            위반하지 않는 범위에서 본 약관을 개정할 수 있습니다.
          </p>
          <p>
            ③ 회사가 약관을 개정할 경우, 적용일자 및 개정 사유를 명시하여 서비스 내 공지사항에
            적용일자 7일 전부터 공지합니다. 다만, 이용자에게 불리한 약관 변경의 경우에는 30일 전에
            공지합니다.
          </p>
          <p>
            ④ 이용자가 개정 약관의 적용에 동의하지 않는 경우, 서비스 이용을 중단하고 회원 탈퇴를
            요청할 수 있습니다.
          </p>
        </Section>

        <Section title="제4조 (서비스 이용 계약의 성립)">
          <p>
            ① 서비스 이용 계약은 이용자가 본 약관 및 개인정보처리방침에 동의하고 회원가입을 완료한
            시점에 성립합니다.
          </p>
          <p>
            ② 만 14세 미만의 미성년자는 법정 대리인의 동의 없이 서비스에 가입할 수 없습니다.
          </p>
        </Section>

        <Section title="제5조 (서비스 이용 요금)">
          <p>
            ① 서비스는 무료 플랜과 유료 플랜으로 제공됩니다. 각 플랜의 기능 및 요금은
            서비스 내 요금제 페이지에서 확인할 수 있습니다.
          </p>
          <p>
            ② 유료 서비스의 요금은 사전에 고지된 요금 기준에 따라 청구됩니다.
          </p>
          <p>
            ③ 회사는 유료 서비스 이용 요금을 변경할 수 있으며, 변경 시 30일 전에 공지합니다.
          </p>
          <p>
            ④ 환불에 관한 사항은 별도의 환불 정책에 따릅니다.
          </p>
        </Section>

        <Section title="제6조 (금지 행위)">
          <p>이용자는 서비스를 통해 다음의 행위를 해서는 안 됩니다:</p>
          <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <li>불법 콘텐츠, 피싱, 사기, 악성 소프트웨어 배포 등 위법 행위</li>
            <li>타인의 개인정보 수집 또는 이용자 유도 행위 (클릭베이트, 스팸)</li>
            <li>저작권, 상표권 등 지식재산권 침해 콘텐츠로의 링크</li>
            <li>아동 성 착취물(CSAM) 등 반사회적 콘텐츠로의 링크</li>
            <li>서비스의 기술적 취약점을 이용하거나 정상적인 운영을 방해하는 행위</li>
            <li>자동화된 수단으로 과도한 요청을 보내는 행위 (허용된 API 한도 초과)</li>
            <li>타인의 계정을 무단으로 이용하는 행위</li>
            <li>본 약관에서 허용하지 않은 방식으로 서비스를 재판매하거나 상업적으로 이용하는 행위</li>
          </ul>
          <p>
            위 금지 행위를 위반한 경우, 회사는 사전 통보 없이 해당 콘텐츠 삭제, 서비스 이용 제한
            또는 계정 해지 조치를 취할 수 있습니다. 위법 행위에 대해서는 관련 법령에 따라 법적
            조치를 취할 수 있습니다.
          </p>
        </Section>

        <Section title="제7조 (콘텐츠 책임)">
          <p>
            ① 이용자가 서비스를 통해 생성하거나 공유하는 콘텐츠에 대한 책임은 이용자에게 있습니다.
          </p>
          <p>
            ② 회사는 이용자가 생성한 단축 링크의 목적지 콘텐츠를 미리 검토하지 않으며, 해당
            콘텐츠의 적법성, 정확성, 안전성에 대해 보증하지 않습니다.
          </p>
          <p>
            ③ 회사는 위법한 콘텐츠가 확인된 경우 해당 링크를 삭제하거나 비활성화할 권리를
            보유합니다.
          </p>
        </Section>

        <Section title="제8조 (서비스의 변경 및 중단)">
          <p>
            ① 회사는 서비스의 내용, 기능, 운영 방식 등을 변경할 수 있습니다. 중요한 변경 사항은
            서비스 내 공지사항을 통해 사전에 안내합니다.
          </p>
          <p>
            ② 회사는 다음의 경우 서비스 제공을 일시적으로 중단할 수 있습니다:
          </p>
          <ul style={{ paddingLeft: "20px" }}>
            <li>정기 점검, 보수, 업그레이드 등 기술적 사유</li>
            <li>천재지변, 전쟁, 사이버 공격 등 불가항력적 사유</li>
            <li>통신 사업자의 서비스 중단</li>
          </ul>
          <p>
            ③ 회사가 서비스를 완전히 종료하는 경우, 최소 30일 전에 사전 공지합니다.
          </p>
        </Section>

        <Section title="제9조 (지식재산권)">
          <p>
            ① 서비스 및 서비스와 관련된 소프트웨어, 디자인, 상표, 로고 등 모든 지식재산권은
            회사에 귀속됩니다.
          </p>
          <p>
            ② 이용자는 서비스를 이용하여 생성한 단축 링크, 분석 데이터 등 본인이 생성한 콘텐츠에
            대한 권리를 보유합니다.
          </p>
          <p>
            ③ 이용자는 회사의 사전 허락 없이 서비스의 콘텐츠를 복제, 수정, 배포하거나 상업적
            목적으로 이용해서는 안 됩니다.
          </p>
        </Section>

        <Section title="제10조 (개인정보 보호)">
          <p>
            회사는 이용자의 개인정보를 「개인정보 보호법」 및 관련 법령에 따라 처리합니다.
            개인정보 수집, 이용, 보유 기간 등 자세한 내용은{" "}
            <Link href="/legal/privacy" style={{ color: "var(--color-ink)" }}>
              개인정보처리방침
            </Link>
            에서 확인하실 수 있습니다.
          </p>
        </Section>

        <Section title="제11조 (책임의 제한)">
          <p>
            ① 회사는 무료로 제공되는 서비스에 대해서는 관련 법령이 허용하는 최대 범위 내에서
            어떠한 보증도 하지 않습니다.
          </p>
          <p>
            ② 회사는 이용자의 귀책 사유로 인한 서비스 이용 장애에 대해서는 책임을 지지 않습니다.
          </p>
          <p>
            ③ 회사의 고의 또는 중대한 과실이 없는 한, 이용자가 서비스 이용으로 인해 입은 손해에
            대해 회사의 책임은 이용자가 지급한 최근 3개월 간의 요금 총액을 초과하지 않습니다.
          </p>
        </Section>

        <Section title="제12조 (분쟁 해결 및 준거법)">
          <p>
            ① 본 약관 및 서비스 이용과 관련한 분쟁은 당사자 간 협의를 통해 우선적으로 해결합니다.
          </p>
          <p>
            ② 협의가 이루어지지 않는 경우, 「소비자기본법」에 따른 소비자분쟁조정위원회 또는
            관련 법원에 소송을 제기할 수 있습니다.
          </p>
          <p>
            ③ 본 약관은 대한민국 법률에 따라 해석되고 적용됩니다.
          </p>
          <p>
            ④ 서비스 이용과 관련한 소송은 회사의 본점 소재지 관할 법원을 전속 관할 법원으로 합니다.
          </p>
        </Section>

        <Section title="부칙">
          <p>본 약관은 2025년 5월 25일부터 시행됩니다.</p>
          <p>
            문의사항: <a href="mailto:contact@rukkit.net" style={{ color: "var(--color-ink)" }}>contact@rukkit.net</a>
          </p>
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
            관련 법령: 전자상거래 등에서의 소비자 보호에 관한 법률 &middot; 약관의 규제에 관한 법률 &middot;
            정보통신망 이용촉진 및 정보보호 등에 관한 법률 &middot; 개인정보 보호법
          </p>
        </div>
      </div>
    </div>
  );
}
