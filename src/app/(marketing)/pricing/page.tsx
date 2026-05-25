import Link from "next/link";
import type { Metadata } from "next";
import { CheckIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "요금 안내 | KRL.KR",
  description: "KRL.KR의 모든 기능은 무료로 제공됩니다.",
};

const features = [
  "URL 단축 (무제한)",
  "클릭 통계 및 분석",
  "QR 코드 생성 (SVG·PNG)",
  "다이나믹 링크",
  "커스텀 슬러그",
  "비밀번호·만료·클릭 제한",
  "서브도메인 (내이름.krl.kr)",
  "이메일 수신함 (이름@krl.kr)",
  "Link-in-bio 페이지",
  "파일 공유",
  "Pastebin",
  "웹훅 인스펙터",
  "기기별 분기 (iOS·Android)",
  "API 접근",
];

export default function PricingPage() {
  return (
    <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}>
      <p className="eyebrow" style={{ justifyContent: "center", marginBottom: "20px" }}>요금 안내</p>

      <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 500, letterSpacing: "-0.03em", marginBottom: "20px" }}>
        전부 무료입니다.
      </h1>

      <p style={{ fontSize: "1.125rem", color: "var(--color-muted)", maxWidth: "460px", margin: "0 auto 56px", lineHeight: 1.65 }}>
        KRL.KR은 유료 플랜이 없습니다.<br />
        가입만 하면 아래 모든 기능을 제한 없이 사용할 수 있습니다.
      </p>

      {/* Feature list card */}
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline-strong)",
        borderRadius: "var(--radius-xl)", padding: "40px 48px", maxWidth: "560px", width: "100%",
        marginBottom: "40px", textAlign: "left" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
          {features.map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.9375rem", color: "var(--color-body)" }}>
              <CheckIcon size={15} strokeWidth={2.5} className="" />
              {f}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/register" className="btn btn-lg btn-pill btn-primary" style={{ textDecoration: "none" }}>
          무료로 시작하기
        </Link>
        <Link href="/features" className="btn btn-lg btn-pill btn-ghost" style={{ textDecoration: "none" }}>
          기능 자세히 보기
        </Link>
      </div>

      <p style={{ marginTop: "32px", fontSize: "0.875rem", color: "var(--color-muted)" }}>
        서비스 운영은 후원으로 유지됩니다 &middot;{" "}
        <a href="https://buymeacoffee.com/rukkitofficial" target="_blank" rel="noopener noreferrer"
          style={{ color: "var(--color-ink)" }}>
          후원하기
        </a>
      </p>
    </div>
  );
}
