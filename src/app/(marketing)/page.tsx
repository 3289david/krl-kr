"use client";
import Link from "next/link";
import { useState } from "react";
import {
  LinkIcon, QrCodeIcon, BarChartIcon, GlobeIcon, ShieldIcon,
  ClockIcon, ZapIcon, CodeIcon, SmartphoneIcon, ArrowRightIcon,
  CheckIcon, ServerIcon,
} from "@/components/icons";

// ─── Hero URL Shortener Form ──────────────────────────────────────────────────
function HeroForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ short: string; slug: string } | null>(null);
  const [error, setError] = useState("");

  async function handleShorten(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

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
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    if (result?.short) {
      navigator.clipboard.writeText(result.short);
    }
  }

  return (
    <div style={{ maxWidth: "600px", width: "100%" }}>
      <form onSubmit={handleShorten}>
        <div
          style={{
            display: "flex",
            gap: "8px",
            background: "var(--color-white)",
            border: "1px solid var(--color-hairline-strong)",
            borderRadius: "var(--radius-pill)",
            padding: "6px 6px 6px 20px",
            boxShadow: "var(--shadow-nav)",
          }}
        >
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="단축할 링크를 붙여넣으세요..."
            required
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "0.9375rem",
              color: "var(--color-ink)",
              fontFamily: "var(--font-sans)",
            }}
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="btn btn-primary btn-pill"
            style={{ flexShrink: 0, minWidth: "100px" }}
          >
            {loading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                처리중...
              </span>
            ) : (
              "단축하기"
            )}
          </button>
        </div>
      </form>

      {error && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px 16px",
            background: "#FFF1F2",
            border: "1px solid #FECDD3",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.875rem",
            color: "#9B1C1C",
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: "12px",
            padding: "14px 18px",
            background: "var(--color-white)",
            border: "1px solid var(--color-hairline-strong)",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            boxShadow: "var(--shadow-nav)",
          }}
        >
          <a
            href={result.short}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--color-ink)",
              textDecoration: "none",
            }}
          >
            {result.short}
          </a>
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button
              onClick={copyToClipboard}
              className="btn btn-secondary btn-sm btn-pill"
              style={{ fontSize: "0.8125rem" }}
            >
              복사
            </button>
            <Link
              href="/register"
              className="btn btn-primary btn-sm btn-pill"
              style={{ textDecoration: "none", fontSize: "0.8125rem" }}
            >
              분석 보기
            </Link>
          </div>
        </div>
      )}

      <p
        style={{
          marginTop: "12px",
          fontSize: "0.8125rem",
          color: "var(--color-muted)",
          textAlign: "center",
        }}
      >
        회원가입 없이 바로 사용 가능 &middot;{" "}
        <Link href="/register" style={{ color: "var(--color-ink)" }}>
          더 많은 기능을 원하신다면 가입하세요
        </Link>
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon,
  title,
  desc,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: string;
}) {
  return (
    <div
      style={{
        background: "var(--color-lifted)",
        border: "1px solid var(--color-hairline)",
        borderRadius: "var(--radius-xl)",
        padding: "28px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "var(--color-hairline-strong)";
        el.style.boxShadow = "0 4px 20px rgba(20,20,19,0.06)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "var(--color-hairline)";
        el.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "var(--radius-md)",
            background: "var(--color-canvas)",
            border: "1px solid var(--color-hairline-strong)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-ink)",
          }}
        >
          {icon}
        </div>
        {badge && (
          <span className="badge badge-dark" style={{ fontSize: "0.6875rem" }}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <h3
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            marginBottom: "6px",
          }}
        >
          {title}
        </h3>
        <p style={{ fontSize: "0.9rem", lineHeight: 1.55, color: "var(--color-muted)" }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

// ─── Pricing Card ─────────────────────────────────────────────────────────────
function PricingCard({
  plan,
  price,
  period,
  desc,
  features,
  cta,
  featured,
}: {
  plan: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  featured?: boolean;
}) {
  return (
    <div
      style={{
        background: featured ? "var(--color-ink)" : "var(--color-lifted)",
        border: `1px solid ${featured ? "var(--color-ink)" : "var(--color-hairline-strong)"}`,
        borderRadius: "var(--radius-xl)",
        padding: "36px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        flex: 1,
        position: "relative",
      }}
    >
      {featured && (
        <div
          style={{
            position: "absolute",
            top: "-12px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--color-arc)",
            color: "white",
            fontSize: "0.6875rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            padding: "4px 12px",
            borderRadius: "var(--radius-pill)",
          }}
        >
          인기
        </div>
      )}

      <div>
        <p
          className="eyebrow"
          style={{ color: featured ? "rgba(243,240,238,0.5)" : undefined, marginBottom: "12px" }}
        >
          {plan}
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "8px" }}>
          <span
            style={{
              fontSize: "2.5rem",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              color: featured ? "var(--color-canvas)" : "var(--color-ink)",
            }}
          >
            {price}
          </span>
          <span
            style={{
              fontSize: "0.9375rem",
              color: featured ? "rgba(243,240,238,0.5)" : "var(--color-muted)",
            }}
          >
            {period}
          </span>
        </div>
        <p
          style={{
            fontSize: "0.9rem",
            color: featured ? "rgba(243,240,238,0.6)" : "var(--color-muted)",
          }}
        >
          {desc}
        </p>
      </div>

      <div style={{ flex: 1 }}>
        {features.map((f) => (
          <div
            key={f}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
              fontSize: "0.9375rem",
              color: featured ? "rgba(243,240,238,0.85)" : "var(--color-body)",
            }}
          >
            <CheckIcon
              size={16}
              className=""
              strokeWidth={2.5}
            />
            {f}
          </div>
        ))}
      </div>

      <Link
        href="/register"
        className={`btn btn-pill ${featured ? "btn-secondary" : "btn-primary"}`}
        style={{
          textDecoration: "none",
          justifyContent: "center",
          background: featured ? "var(--color-canvas)" : undefined,
          color: featured ? "var(--color-ink)" : undefined,
        }}
      >
        {cta}
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section
        className="section"
        style={{
          paddingTop: "80px",
          paddingBottom: "80px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ghost watermark */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "0",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "min(20vw, 240px)",
            fontWeight: 500,
            letterSpacing: "-0.03em",
            color: "#EAE6E2",
            pointerEvents: "none",
            userSelect: "none",
            whiteSpace: "nowrap",
            lineHeight: 1,
            zIndex: 0,
          }}
        >
          KRL
        </div>

        <div
          className="container"
          style={{ position: "relative", zIndex: 1 }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "28px",
            }}
          >
            <span className="badge badge-dark" style={{ gap: "6px" }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <circle cx="4" cy="4" r="3" fill="#30d158" />
              </svg>
              Cloudflare Edge — 전세계 즉시 응답
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1.0,
              marginBottom: "24px",
              color: "var(--color-ink)",
            }}
          >
            링크를
            <br />
            더 스마트하게.
          </h1>

          <p
            style={{
              fontSize: "1.125rem",
              color: "var(--color-muted)",
              maxWidth: "480px",
              margin: "0 auto 40px",
              lineHeight: 1.6,
            }}
          >
            단축, 추적, 분석, QR 코드 —{" "}
            <br className="hide-mobile" />
            모든 링크 관리를 한 곳에서.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "40px",
            }}
          >
            <HeroForm />
          </div>

          {/* Stats */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "32px",
              flexWrap: "wrap",
            }}
          >
            {[
              { value: "1M+", label: "단축된 링크" },
              { value: "50M+", label: "총 클릭 수" },
              { value: "99.9%", label: "가동 시간" },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "var(--color-ink)",
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Terminal Demo ────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 96px" }}>
        <div className="container">
          <div className="terminal-card">
            <div className="terminal-header">
              <div className="terminal-dot" style={{ background: "#FF5F57" }} />
              <div className="terminal-dot" style={{ background: "#FFBD2E" }} />
              <div className="terminal-dot" style={{ background: "#28CA42" }} />
              <span
                style={{
                  marginLeft: "8px",
                  fontSize: "0.8125rem",
                  color: "rgba(243,240,238,0.4)",
                }}
              >
                krl.kr — API
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="terminal-prompt">
                <span style={{ color: "var(--color-ash)" }}>curl</span>
                <span style={{ color: "var(--color-arc)" }}>-X POST</span>
                <span style={{ color: "rgba(243,240,238,0.8)" }}>
                  https://krl.kr/api/v1/shorten
                </span>
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "var(--radius-xs)",
                  padding: "12px 14px",
                  fontSize: "0.8125rem",
                  fontFamily: "var(--font-mono)",
                  color: "rgba(243,240,238,0.7)",
                  lineHeight: 1.8,
                }}
              >
                <div>
                  <span style={{ color: "var(--color-arc)" }}>POST</span> /api/v1/shorten
                </div>
                <div style={{ color: "rgba(243,240,238,0.4)" }}>{"{"}</div>
                <div style={{ paddingLeft: "20px" }}>
                  <span style={{ color: "#30d158" }}>&quot;url&quot;</span>:{" "}
                  <span style={{ color: "rgba(243,240,238,0.8)" }}>
                    &quot;https://example.com/very-long-url&quot;
                  </span>
                  ,
                </div>
                <div style={{ paddingLeft: "20px" }}>
                  <span style={{ color: "#30d158" }}>&quot;slug&quot;</span>:{" "}
                  <span style={{ color: "rgba(243,240,238,0.8)" }}>&quot;event&quot;</span>,
                </div>
                <div style={{ paddingLeft: "20px" }}>
                  <span style={{ color: "#30d158" }}>&quot;expires_at&quot;</span>:{" "}
                  <span style={{ color: "#F37338" }}>&quot;2025-12-31&quot;</span>
                </div>
                <div style={{ color: "rgba(243,240,238,0.4)" }}>{"}"}</div>
                <div style={{ marginTop: "8px", color: "rgba(243,240,238,0.3)" }}>
                  # Response
                </div>
                <div style={{ color: "rgba(243,240,238,0.4)" }}>{"{"}</div>
                <div style={{ paddingLeft: "20px" }}>
                  <span style={{ color: "#30d158" }}>&quot;short_url&quot;</span>:{" "}
                  <span style={{ color: "rgba(243,240,238,0.8)" }}>
                    &quot;https://krl.kr/event&quot;
                  </span>
                </div>
                <div style={{ color: "rgba(243,240,238,0.4)" }}>{"}"}</div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "16px",
                paddingTop: "16px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                fontSize: "0.75rem",
                color: "rgba(243,240,238,0.3)",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span>tab 전환 · ctrl+c 중단</span>
              <span>
                <span style={{ color: "var(--color-arc)" }}>200</span> OK &middot; 12ms
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ────────────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <p className="eyebrow" style={{ justifyContent: "center", marginBottom: "16px" }}>
              기능
            </p>
            <h2 style={{ marginBottom: "16px" }}>
              링크의 모든 것을 제어하세요
            </h2>
            <p
              style={{
                fontSize: "1.0625rem",
                color: "var(--color-muted)",
                maxWidth: "480px",
                margin: "0 auto",
              }}
            >
              단순한 URL 단축 그 이상 — 마케터, 개발자, 크리에이터를 위한 풀 플랫폼
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
            }}
          >
            <FeatureCard
              icon={<LinkIcon size={22} />}
              title="URL 단축"
              desc="커스텀 슬러그, 만료 날짜, 비밀번호 보호를 포함한 완전한 링크 관리."
            />
            <FeatureCard
              icon={<BarChartIcon size={22} />}
              title="실시간 분석"
              desc="국가, 디바이스, 브라우저, 유입 경로별 클릭 통계를 실시간으로 확인."
            />
            <FeatureCard
              icon={<QrCodeIcon size={22} />}
              title="QR 코드 생성"
              desc="SVG/PNG 다운로드, 로고 삽입, 스타일 커스텀이 가능한 다이나믹 QR."
              badge="NEW"
            />
            <FeatureCard
              icon={<GlobeIcon size={22} />}
              title="서브도메인 서비스"
              desc="danwoo.krl.kr — GitHub Pages, Vercel, HTML 업로드 모두 지원."
            />
            <FeatureCard
              icon={<ZapIcon size={22} />}
              title="다이나믹 링크"
              desc="링크의 목적지를 언제든지 변경. QR 코드를 다시 만들 필요가 없습니다."
            />
            <FeatureCard
              icon={<CodeIcon size={22} />}
              title="강력한 API"
              desc="REST API로 Discord Bot, CI/CD, 스크립트에서 자동화 가능."
            />
            <FeatureCard
              icon={<SmartphoneIcon size={22} />}
              title="앱 링크 (Deep Link)"
              desc="Android/iOS를 자동 감지해 앱 또는 스토어로 분기. 모바일 최적화."
            />
            <FeatureCard
              icon={<ShieldIcon size={22} />}
              title="보안 & 접근 제어"
              desc="비밀번호 보호, IP 제한, 클릭 횟수 제한으로 링크를 안전하게."
            />
            <FeatureCard
              icon={<ClockIcon size={22} />}
              title="임시 링크"
              desc="파일 공유, 시간 제한 링크, 다운로드 횟수 제한 기능으로 일회용 링크 생성."
            />
          </div>
        </div>
      </section>

      {/* ─── Additional Tools ─────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
              alignItems: "center",
            }}
          >
            <div>
              <p className="eyebrow" style={{ marginBottom: "20px" }}>개발자 도구</p>
              <h2 style={{ marginBottom: "20px" }}>
                개발자를 위한
                <br />
                모든 도구
              </h2>
              <p
                style={{
                  color: "var(--color-muted)",
                  marginBottom: "32px",
                  lineHeight: 1.7,
                  maxWidth: "420px",
                }}
              >
                웹훅 테스트, JSON 호스팅, Pastebin, 파일 공유, 임시 서브도메인까지.
                개발 워크플로우를 가속하는 도구들.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {[
                  {
                    icon: <ServerIcon size={18} />,
                    title: "웹훅 인스펙터",
                    desc: "Stripe, GitHub, Discord 웹훅을 실시간으로 테스트",
                  },
                  {
                    icon: <CodeIcon size={18} />,
                    title: "Pastebin",
                    desc: "코드, 로그, 텍스트를 만료 링크로 공유",
                  },
                  {
                    icon: <GlobeIcon size={18} />,
                    title: "JSON 호스팅",
                    desc: "Mock API, 설정 파일을 즉시 배포",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--color-surface-card)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        color: "var(--color-ink)",
                      }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <p
                        style={{
                          fontWeight: 600,
                          fontSize: "0.9375rem",
                          marginBottom: "2px",
                        }}
                      >
                        {item.title}
                      </p>
                      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dark card */}
            <div className="terminal-card" style={{ borderRadius: "var(--radius-xl)" }}>
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "rgba(243,240,238,0.4)",
                  marginBottom: "20px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                webhook.krl.kr
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { method: "POST", path: "/webhook/abc123", status: "200", time: "12ms" },
                  { method: "POST", path: "/webhook/abc123", status: "200", time: "8ms" },
                  { method: "GET",  path: "/webhook/abc123", status: "200", time: "5ms" },
                ].map((req, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 12px",
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: "var(--radius-xs)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span
                      style={{
                        color: req.method === "POST" ? "#F37338" : "#30d158",
                        fontWeight: 600,
                        minWidth: "40px",
                      }}
                    >
                      {req.method}
                    </span>
                    <span style={{ flex: 1, color: "rgba(243,240,238,0.7)" }}>
                      {req.path}
                    </span>
                    <span style={{ color: "#30d158" }}>{req.status}</span>
                    <span style={{ color: "rgba(243,240,238,0.3)" }}>{req.time}</span>
                  </div>
                ))}
              </div>
              <p
                style={{
                  marginTop: "16px",
                  fontSize: "0.75rem",
                  color: "rgba(243,240,238,0.2)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                실시간 요청 스트림
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ──────────────────────────────────────────────────── */}
      <section className="section" id="pricing">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <p className="eyebrow" style={{ justifyContent: "center", marginBottom: "16px" }}>
              요금제
            </p>
            <h2 style={{ marginBottom: "16px" }}>투명한 요금제</h2>
            <p style={{ color: "var(--color-muted)", fontSize: "1.0625rem" }}>
              무료로 시작하고, 필요할 때 업그레이드하세요.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "20px",
              alignItems: "stretch",
            }}
          >
            <PricingCard
              plan="무료"
              price="₩0"
              period="/ 월"
              desc="개인 사용 및 테스트에 적합"
              features={[
                "월 50개 링크 생성",
                "기본 클릭 분석",
                "QR 코드 생성",
                "30일 데이터 보관",
                "API 접근 (100 req/일)",
              ]}
              cta="무료로 시작"
            />
            <PricingCard
              plan="프로"
              price="₩9,900"
              period="/ 월"
              desc="개인 브랜드 및 마케터에 최적"
              features={[
                "무제한 링크 생성",
                "고급 실시간 분석",
                "커스텀 도메인",
                "무제한 QR 코드",
                "비밀번호 보호",
                "다이나믹 링크",
                "1년 데이터 보관",
                "API 접근 (10,000 req/일)",
              ]}
              cta="프로 시작하기"
              featured
            />
            <PricingCard
              plan="비즈니스"
              price="₩29,900"
              period="/ 월"
              desc="팀과 기업을 위한 플랜"
              features={[
                "팀원 5명 포함",
                "무제한 모든 기능",
                "앱 링크 (Deep Link)",
                "서브도메인 서비스",
                "Link-in-bio 페이지",
                "파일 공유 (10GB)",
                "웹훅 인스펙터",
                "우선 지원",
              ]}
              cta="비즈니스 시작"
            />
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ───────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div
            style={{
              background: "var(--color-ink)",
              borderRadius: "var(--radius-xl)",
              padding: "64px",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Background pattern */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `radial-gradient(circle at 20% 50%, rgba(243,115,56,0.08) 0%, transparent 60%),
                                  radial-gradient(circle at 80% 50%, rgba(48,209,88,0.05) 0%, transparent 60%)`,
              }}
            />

            <div style={{ position: "relative", zIndex: 1 }}>
              <p
                className="eyebrow"
                style={{
                  justifyContent: "center",
                  color: "rgba(243,240,238,0.4)",
                  marginBottom: "20px",
                }}
              >
                지금 시작하세요
              </p>
              <h2
                style={{
                  color: "var(--color-canvas)",
                  marginBottom: "16px",
                  fontSize: "2.5rem",
                }}
              >
                오늘 바로 첫 링크를
                <br />
                단축해보세요
              </h2>
              <p
                style={{
                  color: "rgba(243,240,238,0.5)",
                  marginBottom: "36px",
                  fontSize: "1.0625rem",
                  maxWidth: "400px",
                  margin: "0 auto 36px",
                }}
              >
                무료 계정으로 시작하고, 필요할 때 언제든 업그레이드하세요.
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href="/register"
                  className="btn btn-lg btn-pill"
                  style={{
                    textDecoration: "none",
                    background: "var(--color-canvas)",
                    color: "var(--color-ink)",
                    border: "none",
                  }}
                >
                  무료로 시작하기
                  <ArrowRightIcon size={18} />
                </Link>
                <Link
                  href="/docs"
                  className="btn btn-lg btn-pill"
                  style={{
                    textDecoration: "none",
                    background: "transparent",
                    color: "rgba(243,240,238,0.7)",
                    border: "1.5px solid rgba(243,240,238,0.2)",
                  }}
                >
                  문서 보기
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none; }
        }
        @media (max-width: 900px) {
          .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .pricing-grid { flex-direction: column !important; }
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
