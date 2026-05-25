"use client";
import Link from "next/link";
import { useState } from "react";
import {
  LinkIcon, QrCodeIcon, BarChartIcon, GlobeIcon, ShieldIcon,
  ClockIcon, ZapIcon, SmartphoneIcon, ArrowRightIcon, CodeIcon, ServerIcon,
} from "@/components/icons";

function HeroForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ short: string; slug: string } | null>(null);
  const [error, setError] = useState("");

  async function handleShorten(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/v1/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "단축 중 오류가 발생했습니다.");
      setResult({ short: data.short_url, slug: data.slug });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: "580px", width: "100%" }}>
      <form onSubmit={handleShorten}>
        <div style={{
          display: "flex", gap: "8px", background: "var(--color-white)",
          border: "1px solid var(--color-hairline-strong)",
          borderRadius: "var(--radius-pill)", padding: "6px 6px 6px 20px",
          boxShadow: "var(--shadow-nav)",
        }}>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="단축할 링크를 붙여넣으세요..." required
            style={{ flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: "0.9375rem", color: "var(--color-ink)", fontFamily: "var(--font-sans)" }} />
          <button type="submit" disabled={loading || !url.trim()}
            className="btn btn-primary btn-pill" style={{ flexShrink: 0, minWidth: "100px" }}>
            {loading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>처리중...
              </span>
            ) : "단축하기"}
          </button>
        </div>
      </form>

      {error && (
        <div style={{ marginTop: "12px", padding: "10px 16px", background: "#FFF1F2",
          border: "1px solid #FECDD3", borderRadius: "var(--radius-sm)",
          fontSize: "0.875rem", color: "#9B1C1C" }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: "12px", padding: "14px 18px", background: "var(--color-white)",
          border: "1px solid var(--color-hairline-strong)", borderRadius: "var(--radius-lg)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
          boxShadow: "var(--shadow-nav)" }}>
          <a href={result.short} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", fontWeight: 600,
              color: "var(--color-ink)", textDecoration: "none" }}>
            {result.short}
          </a>
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button onClick={() => navigator.clipboard.writeText(result.short)}
              className="btn btn-secondary btn-sm btn-pill" style={{ fontSize: "0.8125rem" }}>
              복사
            </button>
            <Link href="/register" className="btn btn-primary btn-sm btn-pill"
              style={{ textDecoration: "none", fontSize: "0.8125rem" }}>
              분석 보기
            </Link>
          </div>
        </div>
      )}

      <p style={{ marginTop: "12px", fontSize: "0.8125rem", color: "var(--color-muted)", textAlign: "center" }}>
        회원가입 없이 바로 사용 가능 &middot;{" "}
        <Link href="/register" style={{ color: "var(--color-ink)" }}>가입하면 더 많은 기능을 이용할 수 있어요</Link>
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function FeatureCard({ icon, title, desc, badge }: {
  icon: React.ReactNode; title: string; desc: string; badge?: string;
}) {
  return (
    <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
      borderRadius: "var(--radius-xl)", padding: "28px", display: "flex", flexDirection: "column", gap: "14px",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease" }}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "var(--color-hairline-strong)"; el.style.boxShadow = "0 4px 20px rgba(20,20,19,0.06)"; }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "var(--color-hairline)"; el.style.boxShadow = "none"; }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "var(--radius-md)",
          background: "var(--color-canvas)", border: "1px solid var(--color-hairline-strong)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-ink)" }}>
          {icon}
        </div>
        {badge && <span className="badge badge-dark" style={{ fontSize: "0.6875rem" }}>{badge}</span>}
      </div>
      <div>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, letterSpacing: "-0.01em", marginBottom: "6px" }}>{title}</h3>
        <p style={{ fontSize: "0.9rem", lineHeight: 1.55, color: "var(--color-muted)" }}>{desc}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: "80px", paddingBottom: "80px",
        textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", top: "0", left: "50%", transform: "translateX(-50%)",
          fontSize: "min(20vw, 240px)", fontWeight: 500, letterSpacing: "-0.03em",
          color: "#EAE6E2", pointerEvents: "none", userSelect: "none", whiteSpace: "nowrap", lineHeight: 1, zIndex: 0 }}>
          KRL
        </div>

        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "28px" }}>
            <span className="badge badge-dark" style={{ gap: "6px" }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <circle cx="4" cy="4" r="3" fill="#30d158" />
              </svg>
              무료 · 회원가입 없이 바로 사용 가능
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", fontWeight: 500,
            letterSpacing: "-0.03em", lineHeight: 1.0, marginBottom: "24px", color: "var(--color-ink)" }}>
            링크를
            <br />더 간결하게.
          </h1>

          <p style={{ fontSize: "1.125rem", color: "var(--color-muted)", maxWidth: "440px",
            margin: "0 auto 40px", lineHeight: 1.6 }}>
            긴 주소를 짧은 krl.kr 링크로 만들고<br className="hide-mobile" />
            클릭 통계, QR 코드, 더 많은 기능을 무료로 사용하세요.
          </p>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "48px" }}>
            <HeroForm />
          </div>
        </div>
      </section>

      {/* ─── Features Grid ───────────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <p className="eyebrow" style={{ justifyContent: "center", marginBottom: "16px" }}>기능</p>
            <h2 style={{ marginBottom: "16px" }}>필요한 기능이 모두 있어요</h2>
            <p style={{ fontSize: "1.0625rem", color: "var(--color-muted)", maxWidth: "420px", margin: "0 auto" }}>
              링크 단축부터 파일 공유, QR 코드, 서브도메인까지 — 전부 무료입니다.
            </p>
          </div>

          <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            <FeatureCard icon={<LinkIcon size={22} />} title="URL 단축"
              desc="짧은 주소, 커스텀 슬러그, 만료 날짜, 비밀번호 보호까지 설정 가능합니다." />
            <FeatureCard icon={<BarChartIcon size={22} />} title="클릭 통계"
              desc="국가, 기기, 브라우저, 유입 경로별 클릭 수를 한눈에 확인하세요." />
            <FeatureCard icon={<QrCodeIcon size={22} />} title="QR 코드" badge="NEW"
              desc="SVG·PNG 다운로드, 로고 삽입, 색상 변경이 가능한 QR 코드를 만들어보세요." />
            <FeatureCard icon={<GlobeIcon size={22} />} title="서브도메인"
              desc="내이름.krl.kr 주소를 만들어 GitHub Pages, Vercel, HTML 파일을 연결하세요." />
            <FeatureCard icon={<ZapIcon size={22} />} title="다이나믹 링크"
              desc="링크 주소를 나중에 바꿔도 QR 코드는 그대로. 한 번 만들면 영구 사용." />
            <FeatureCard icon={<SmartphoneIcon size={22} />} title="기기별 분기"
              desc="같은 링크로 방문해도 Android는 앱으로, iOS는 앱스토어로 각각 보낼 수 있습니다." />
            <FeatureCard icon={<ShieldIcon size={22} />} title="보안 링크"
              desc="비밀번호 설정, 클릭 횟수 제한, 만료 날짜로 링크 접근을 제한하세요." />
            <FeatureCard icon={<ClockIcon size={22} />} title="파일 공유"
              desc="파일을 업로드하고 단축 링크로 공유하세요. 만료 기간을 설정할 수 있습니다." />
            <FeatureCard icon={<CodeIcon size={22} />} title="API 제공"
              desc="만든 서비스에서도 krl.kr 기능을 쓸 수 있도록 API를 제공합니다." />
          </div>
        </div>
      </section>

      {/* ─── More Tools ─────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="dev-tools-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "center" }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: "20px" }}>더 많은 도구</p>
              <h2 style={{ marginBottom: "20px" }}>
                링크 외에도<br />이런 것들을 할 수 있어요
              </h2>
              <p style={{ color: "var(--color-muted)", marginBottom: "32px", lineHeight: 1.7, maxWidth: "420px" }}>
                텍스트 공유, 웹훅 테스트, 이메일 수신함, Link-in-bio 페이지까지.
                별도 서버 없이 바로 쓸 수 있습니다.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {[
                  { icon: <ServerIcon size={18} />, title: "웹훅 인스펙터", desc: "외부 서비스에서 보내는 웹훅을 실시간으로 확인합니다." },
                  { icon: <CodeIcon size={18} />, title: "Pastebin", desc: "코드, 로그, 메모를 링크로 만들어 공유하세요." },
                  { icon: <GlobeIcon size={18} />, title: "이메일 수신함", desc: "이름@krl.kr 주소로 이메일을 받아 웹에서 확인할 수 있습니다." },
                ].map((item) => (
                  <div key={item.title} style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface-card)", display: "flex", alignItems: "center",
                      justifyContent: "center", flexShrink: 0, color: "var(--color-ink)" }}>
                      {item.icon}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: "2px" }}>{item.title}</p>
                      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Link-in-bio preview */}
            <div className="terminal-card" style={{ borderRadius: "var(--radius-xl)" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.04em",
                textTransform: "uppercase", color: "rgba(243,240,238,0.4)", marginBottom: "20px",
                fontFamily: "var(--font-mono)" }}>
                krl.kr/bio/@username
              </p>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", paddingBottom: "8px" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "var(--color-canvas)", fontWeight: 600, fontSize: "0.9375rem" }}>내 이름</div>
                  <div style={{ color: "rgba(243,240,238,0.4)", fontSize: "0.8125rem", marginTop: "2px" }}>한 줄 소개를 여기에</div>
                </div>
                {["🌐  내 웹사이트", "📷  인스타그램", "✉️  이메일 문의"].map((label) => (
                  <div key={label} style={{ width: "100%", padding: "10px 16px",
                    background: "rgba(255,255,255,0.06)", borderRadius: "var(--radius-sm)",
                    textAlign: "center", color: "rgba(243,240,238,0.75)", fontSize: "0.875rem" }}>
                    {label}
                  </div>
                ))}
              </div>
              <p style={{ marginTop: "16px", fontSize: "0.75rem", color: "rgba(243,240,238,0.2)",
                fontFamily: "var(--font-mono)", textAlign: "center" }}>
                Link-in-bio 페이지 — 무료
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="cta-banner" style={{ background: "var(--color-ink)", borderRadius: "var(--radius-xl)",
            padding: "64px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", inset: 0,
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(243,115,56,0.08) 0%, transparent 60%),
                                radial-gradient(circle at 80% 50%, rgba(48,209,88,0.05) 0%, transparent 60%)` }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <h2 style={{ color: "var(--color-canvas)", marginBottom: "16px", fontSize: "2.25rem" }}>
                지금 바로 시작해보세요
              </h2>
              <p style={{ color: "rgba(243,240,238,0.5)", fontSize: "1.0625rem",
                maxWidth: "360px", margin: "0 auto 36px" }}>
                가입하면 클릭 통계, 커스텀 슬러그, QR 코드, 이메일 수신함을 무료로 쓸 수 있습니다.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                <Link href="/register" className="btn btn-lg btn-pill" style={{
                  textDecoration: "none", background: "var(--color-canvas)",
                  color: "var(--color-ink)", border: "none" }}>
                  무료로 시작하기
                  <ArrowRightIcon size={18} />
                </Link>
                <Link href="/docs" className="btn btn-lg btn-pill" style={{
                  textDecoration: "none", background: "transparent",
                  color: "rgba(243,240,238,0.7)", border: "1.5px solid rgba(243,240,238,0.2)" }}>
                  API 문서
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) { .hide-mobile { display: none; } }
        @media (max-width: 900px) {
          .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dev-tools-grid { grid-template-columns: 1fr !important; }
          .cta-banner { padding: 40px 24px !important; }
        }
        @media (max-width: 600px) {
          .features-grid { grid-template-columns: 1fr !important; }
          h1 { font-size: 2.5rem !important; }
        }
      `}</style>
    </>
  );
}
