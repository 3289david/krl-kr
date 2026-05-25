import Link from "next/link";
import { GlobeIcon, ZapIcon, ShieldIcon } from "@/components/icons";

export default function AboutPage() {
  return (
    <main>
      <section className="section">
        <div className="container" style={{ maxWidth: "800px" }}>
          <p className="eyebrow" style={{ marginBottom: "24px" }}>소개</p>
          <h1 style={{ marginBottom: "24px" }}>KRL.KR에 대하여</h1>
          <p style={{ fontSize: "1.25rem", color: "var(--color-muted)", lineHeight: 1.6, marginBottom: "48px" }}>
            KRL.KR은 개발자와 마케터를 위한 완전한 링크 인프라 플랫폼입니다.
            단순 URL 단축을 넘어, 분석, QR 코드, 파일 공유, 웹훅 검사까지 — 하나의 플랫폼에서 모두 제공합니다.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "64px" }}>
            {[
              { icon: <ZapIcon size={22} />, title: "빠른 Edge 리다이렉트", desc: "Cloudflare의 전 세계 300개 이상의 PoP에서 밀리초 단위로 리다이렉트됩니다." },
              { icon: <ShieldIcon size={22} />, title: "보안 우선", desc: "PBKDF2 비밀번호 해싱, JWT 인증, 비밀번호 보호 링크를 기본으로 제공합니다." },
              { icon: <GlobeIcon size={22} />, title: "글로벌 CDN", desc: "Cloudflare Workers와 D1으로 구축하여 어디서든 빠른 응답 속도를 보장합니다." },
            ].map((item) => (
              <div key={item.title} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "var(--radius-sm)", background: "var(--color-surface-card)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-ink)", marginBottom: "16px" }}>
                  {item.icon}
                </div>
                <h4 style={{ marginBottom: "8px" }}>{item.title}</h4>
                <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Mission */}
          <div style={{ marginBottom: "64px" }}>
            <h2 style={{ marginBottom: "20px" }}>우리의 미션</h2>
            <p style={{ color: "var(--color-muted)", lineHeight: 1.8, marginBottom: "16px" }}>
              인터넷에서 링크는 모든 것의 시작입니다. 하지만 대부분의 URL 단축 서비스는 너무 단순하거나,
              너무 복잡하거나, 너무 비쌉니다. KRL.KR은 그 중간 지점을 찾았습니다.
            </p>
            <p style={{ color: "var(--color-muted)", lineHeight: 1.8 }}>
              개발자가 자동화하고, 마케터가 분석하고, 크리에이터가 공유할 수 있는 완전한 링크 인프라를 구축하는 것이
              우리의 목표입니다. 그것도 합리적인 가격으로.
            </p>
          </div>

          {/* Tech stack */}
          <div style={{ marginBottom: "64px" }}>
            <h2 style={{ marginBottom: "20px" }}>기술 스택</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
              {[
                { name: "Cloudflare Workers", desc: "엣지 컴퓨팅 런타임" },
                { name: "Cloudflare D1", desc: "SQLite 기반 엣지 데이터베이스" },
                { name: "Cloudflare R2", desc: "파일 스토리지 (S3 호환)" },
                { name: "Next.js 15", desc: "React 풀스택 프레임워크" },
                { name: "TypeScript", desc: "타입 안전 코드" },
                { name: "Jose (JWT)", desc: "엣지 호환 인증" },
              ].map((tech) => (
                <div key={tech.name} style={{ padding: "16px 20px", background: "var(--color-surface-card)", borderRadius: "var(--radius-lg)" }}>
                  <p style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: "4px" }}>{tech.name}</p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{tech.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Team */}
          <div style={{ marginBottom: "64px" }}>
            <h2 style={{ marginBottom: "24px" }}>만든 사람</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "20px", padding: "24px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--color-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "var(--color-canvas)", fontWeight: 700, fontSize: "1.25rem", fontFamily: "var(--font-mono)" }}>D</span>
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "4px" }}>DavidStacks</p>
                <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem", marginBottom: "8px" }}>개발자 및 창립자</p>
                <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                  KRL.KR을 혼자 설계하고 개발했습니다.
                  Cloudflare의 엣지 인프라를 활용하여 빠르고 안정적인 서비스를 만들었습니다.
                </p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div style={{ background: "var(--color-ink)", borderRadius: "var(--radius-xl)", padding: "40px", textAlign: "center" }}>
            <h2 style={{ color: "var(--color-canvas)", marginBottom: "16px" }}>함께 만들어가요</h2>
            <p style={{ color: "rgba(243,240,238,0.6)", marginBottom: "28px" }}>
              버그 리포트, 기능 제안, 협업 문의 모두 환영합니다.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <a href="mailto:support@krl.kr" className="btn btn-pill" style={{ textDecoration: "none", background: "var(--color-canvas)", color: "var(--color-ink)" }}>
                이메일 문의
              </a>
              <Link href="/support" className="btn btn-pill btn-ghost" style={{ textDecoration: "none", color: "var(--color-canvas)", border: "1px solid rgba(255,255,255,0.2)" }}>
                후원하기
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
