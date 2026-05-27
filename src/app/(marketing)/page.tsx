"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

// ─── Shorten Form ─────────────────────────────────────────────────────────────

function ShortenForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ short: string; slug: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function normalizeUrl(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return trimmed;
    if (!/^https?:\/\//i.test(trimmed)) return "https://" + trimmed;
    return trimmed;
  }

  async function handleShorten(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    const normalized = normalizeUrl(url);
    setUrl(normalized);
    setLoading(true); setError(""); setResult(null); setCopied(false);
    try {
      const res = await fetch("/api/v1/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");
      setResult({ short: data.short_url, slug: data.slug });
      setUrl("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally { setLoading(false); }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.short);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ width: "100%", maxWidth: "680px" }}>
      <form onSubmit={handleShorten}>
        <div className="shorten-form-inner" style={{
          display: "flex",
          background: "#fff",
          border: "2px solid var(--color-hairline-strong)",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(20,20,19,0.08)",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = "var(--color-ink)";
            e.currentTarget.style.boxShadow = "0 4px 32px rgba(20,20,19,0.14)";
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = "var(--color-hairline-strong)";
            e.currentTarget.style.boxShadow = "0 4px 24px rgba(20,20,19,0.08)";
          }}
        >
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={(e) => { if (e.target.value.trim()) setUrl(normalizeUrl(e.target.value)); }}
            placeholder="긴 주소를 여기에 붙여넣으세요"
            required
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              padding: "18px 20px",
              fontSize: "1rem",
              color: "var(--color-ink)",
              fontFamily: "var(--font-sans)",
              minWidth: 0,
            }}
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            style={{
              padding: "18px 24px",
              background: "var(--color-ink)",
              color: "var(--color-canvas)",
              border: "none",
              cursor: loading || !url.trim() ? "default" : "pointer",
              fontSize: "0.9375rem",
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              opacity: loading || !url.trim() ? 0.55 : 1,
              flexShrink: 0,
              transition: "opacity 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "처리중…" : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                URL 만들기
              </span>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div style={{
          marginTop: "10px", padding: "11px 16px",
          background: "#FFF1F2", border: "1px solid #FECDD3",
          borderRadius: "10px", fontSize: "0.875rem", color: "#9B1C1C",
        }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: "10px", padding: "14px 18px",
          background: "#fff",
          border: "1.5px solid var(--color-ink)",
          borderRadius: "12px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px",
          boxShadow: "0 2px 12px rgba(20,20,19,0.08)",
          flexWrap: "wrap",
        }}>
          <a
            href={result.short}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--color-ink)",
              textDecoration: "none",
            }}
          >
            {result.short}
          </a>
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button
              onClick={handleCopy}
              style={{
                padding: "8px 18px", borderRadius: "8px",
                border: "1px solid var(--color-hairline-strong)",
                background: copied ? "var(--color-ink)" : "#fff",
                color: copied ? "var(--color-canvas)" : "var(--color-ink)",
                cursor: "pointer", fontSize: "0.875rem", fontWeight: 600,
                fontFamily: "var(--font-sans)", transition: "all 0.15s",
              }}
            >
              {copied ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  복사됨
                </span>
              ) : "복사"}
            </button>
            <Link
              href="/dashboard/links"
              style={{
                padding: "8px 14px", borderRadius: "8px",
                background: "var(--color-surface-card)",
                border: "1px solid var(--color-hairline)",
                color: "var(--color-body)", textDecoration: "none",
                fontSize: "0.875rem", fontWeight: 500,
              }}
            >
              통계
            </Link>
          </div>
        </div>
      )}

      <p style={{
        marginTop: "12px", fontSize: "0.8125rem",
        color: "var(--color-muted)", textAlign: "center",
      }}>
        바로 시작 가능 &nbsp;·&nbsp;{" "}
        <Link href="/register" style={{ color: "var(--color-body)", textDecoration: "underline" }}>
          가입 후 커스텀 주소·무제한 통계 사용
        </Link>
      </p>
    </div>
  );
}

// ─── Static data ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
    title: "짧고 깔끔한 URL",
    desc: "krl.kr/abc — 복잡한 주소를 5자 이내 단축 링크로 변환",
    gradient: "linear-gradient(135deg, #667eea20 0%, #764ba220 100%)",
    accent: "#667eea",
  },
  {
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    title: "클릭 분석",
    desc: "국가·기기·시간대별 방문 통계, QR 스캔 수까지 한눈에",
    gradient: "linear-gradient(135deg, #f093fb20 0%, #f5576c20 100%)",
    accent: "#f5576c",
  },
  {
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    title: "비밀번호·만료",
    desc: "링크에 비밀번호 잠금, 날짜·클릭 수 만료 설정 지원",
    gradient: "linear-gradient(135deg, #4facfe20 0%, #00f2fe20 100%)",
    accent: "#4facfe",
  },
  {
    icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
    title: "개발자 API",
    desc: "REST API로 링크 생성·통계 조회·Webhook 연동 가능",
    gradient: "linear-gradient(135deg, #43e97b20 0%, #38f9d720 100%)",
    accent: "#43e97b",
  },
];

const TOOLS = [
  { href: "/qr", label: "QR 코드 생성기", desc: "PNG·SVG, 색상·로고 변경", icon: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M17 17h.01 M17 21h.01 M21 17h.01 M21 21h.01" },
  { href: "/tools/drop", label: "파일 공유", desc: "업로드 후 링크로 공유", icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" },
  { href: "/tools/paste", label: "코드·텍스트 공유", desc: "붙여넣고 링크로 공유", icon: "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z" },
  { href: "/tools/webhook", label: "웹훅 테스트", desc: "HTTP 요청 실시간 확인", icon: "M18 16.98h-5.99c-1.1 0-1.95.68-2.23 1.61A3 3 0 012 17c0-1.66 1.34-3 3-3h.5M12 3C9.24 3 7 5.24 7 8c0 2.16 1.28 3.99 3.12 4.82" },
  { href: "/tools/bio", label: "Link-in-bio", desc: "krl.kr/@닉네임 프로필", icon: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" },
  { href: "/dashboard/subdomains", label: "서브도메인", desc: "내이름.krl.kr 주소", icon: "M12 2a10 10 0 100 20A10 10 0 0012 2zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" },
];

// ─── Board sub-component ──────────────────────────────────────────────────────

const BOARD_META_HOME: Record<string, { label: string; color: string; path: string; iconD: string }> = {
  notice:  { label: "공지사항", color: "#ef4444", path: "notice",  iconD: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" },
  free:    { label: "자유게시판", color: "#3b82f6", path: "free",    iconD: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
  feature: { label: "기능 제안", color: "#8b5cf6", path: "feature", iconD: "M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" },
};

interface BoardPost { id: string; title: string; comment_count: number; created_at: number; author: { name: string } }

function BoardSection({ board }: { board: string }) {
  const meta = BOARD_META_HOME[board];
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/community?board=${board}&limit=5`)
      .then((r) => r.json())
      .then((d) => setPosts(d.posts?.slice(0, 5) ?? []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [board]);

  return (
    <div style={{
      background: "var(--color-lifted)",
      border: "1px solid var(--color-hairline)",
      borderRadius: "12px",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "13px 18px",
        borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-white)",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.875rem", fontWeight: 700, color: "var(--color-ink)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={meta.iconD} />
          </svg>
          {meta.label}
        </span>
        <Link href={`/community?board=${meta.path}`} style={{ fontSize: "0.75rem", color: "var(--color-muted)", textDecoration: "none", fontWeight: 500 }}>
          전체보기 →
        </Link>
      </div>
      {!loaded ? (
        <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--color-muted)", fontSize: "0.8125rem" }}>불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--color-muted)", fontSize: "0.8125rem" }}>아직 게시물이 없습니다.</div>
      ) : (
        <div>
          {posts.map((p) => (
            <Link key={p.id} href={`/community/${p.id}`} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "9px 18px", textDecoration: "none",
              borderBottom: "1px solid var(--color-hairline)",
              gap: "8px", transition: "background 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: "0.84375rem", color: "var(--color-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {p.title}
              </span>
              {p.comment_count > 0 && (
                <span style={{ fontSize: "0.75rem", color: "var(--color-arc)", fontWeight: 600, flexShrink: 0 }}>[{p.comment_count}]</span>
              )}
              <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", flexShrink: 0 }}>
                {p.author.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <style>{`
        @media (max-width: 520px) {
          .shorten-form-inner {
            flex-direction: column !important;
            border-radius: 14px !important;
          }
          .shorten-form-inner button {
            border-radius: 0 0 10px 10px !important;
            width: 100% !important;
            justify-content: center !important;
          }
          .home-hero { padding: 44px 20px 36px !important; }
          .home-features { padding: 40px 20px 0 !important; }
          .home-tools { padding: 36px 20px 0 !important; }
          .home-community { padding: 40px 20px 0 !important; }
          .home-cta { padding: 40px 20px 60px !important; }
          .home-cta-inner { padding: 28px 24px !important; flex-direction: column !important; align-items: stretch !important; }
          .home-cta-buttons { flex-direction: column !important; }
          .home-cta-buttons a { justify-content: center !important; }
        }
        @media (max-width: 768px) {
          .home-hero { padding: 52px 20px 40px !important; }
          .home-hero h1 { font-size: clamp(1.875rem, 7vw, 2.5rem) !important; }
          .home-hero-desc { font-size: 0.9375rem !important; }
        }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="home-hero" style={{
        padding: "72px 24px 56px",
        textAlign: "center",
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(58,58,239,0.07) 0%, transparent 60%), linear-gradient(180deg, var(--color-white) 0%, var(--color-canvas) 100%)",
        borderBottom: "1px solid var(--color-hairline)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative blobs */}
        <div style={{
          position: "absolute", top: "-60px", left: "calc(50% - 300px)",
          width: "200px", height: "200px",
          background: "radial-gradient(circle, rgba(58,58,239,0.06), transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: "20px", right: "calc(50% - 320px)",
          width: "160px", height: "160px",
          background: "radial-gradient(circle, rgba(139,92,246,0.05), transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: "1100px", margin: "0 auto", position: "relative" }}>
          {/* Heading */}
          <h1 style={{
            fontSize: "clamp(2rem, 5vw, 3.25rem)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            marginBottom: "16px",
            color: "var(--color-ink)",
          }}>
            내가 보낸 링크,<br />
            <span style={{
              background: "linear-gradient(135deg, var(--color-ink) 0%, rgba(58,58,239,0.7) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>이제 직접 통제하세요</span>
          </h1>
          <p className="home-hero-desc" style={{
            fontSize: "1.0625rem",
            color: "var(--color-muted)",
            marginBottom: "36px",
            maxWidth: "520px",
            margin: "0 auto 36px",
            lineHeight: 1.65,
          }}>
            클릭 분석·QR 코드·파일 공유·서브도메인 —{" "}
            <strong style={{ color: "var(--color-ink)", fontFamily: "var(--font-mono)" }}>krl.kr</strong>{" "}
            계정 하나로 전부 다룰 수 있습니다.
          </p>

          {/* Shorten form */}
          <div style={{ display: "flex", justifyContent: "center", padding: "0 4px" }}>
            <ShortenForm />
          </div>

        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="home-features" style={{ padding: "52px 24px 0" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <p className="section-label" style={{ marginBottom: "16px" }}>주요 기능</p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "12px",
          }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{
                padding: "22px",
                background: "var(--color-lifted)",
                border: "1px solid var(--color-hairline)",
                borderRadius: "12px",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}>
                <div style={{
                  width: "38px", height: "38px",
                  borderRadius: "10px",
                  background: f.gradient,
                  border: `1px solid ${f.accent}20`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "12px",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke={f.accent} strokeWidth="1.75"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d={f.icon} />
                  </svg>
                </div>
                <p style={{
                  fontSize: "0.9375rem", fontWeight: 700,
                  color: "var(--color-ink)", marginBottom: "4px",
                }}>
                  {f.title}
                </p>
                <p style={{
                  fontSize: "0.8125rem", color: "var(--color-muted)", lineHeight: 1.5,
                }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tools / Services ─────────────────────────────────────────────── */}
      <section className="home-tools" style={{ padding: "44px 24px 0" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <p className="section-label" style={{ marginBottom: "16px" }}>웹 서비스</p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))",
            gap: "10px",
          }}>
            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "12px",
                  padding: "16px", borderRadius: "10px", textDecoration: "none",
                  background: "var(--color-lifted)",
                  border: "1px solid var(--color-hairline)",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--color-hairline-strong)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(20,20,19,0.07)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--color-hairline)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                <svg
                  width="18" height="18" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor"
                  strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                  style={{ color: "var(--color-muted)", flexShrink: 0, marginTop: "2px" }}
                >
                  <path d={tool.icon} />
                </svg>
                <div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-ink)", marginBottom: "2px" }}>
                    {tool.label}
                  </p>
                  <p style={{ fontSize: "0.775rem", color: "var(--color-muted)", lineHeight: 1.4 }}>
                    {tool.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Community ────────────────────────────────────────────────────── */}
      <section className="home-community" style={{ padding: "52px 24px 0" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", marginBottom: "16px",
          }}>
            <p className="section-label">커뮤니티</p>
            <Link href="/community" style={{
              fontSize: "0.8125rem", color: "var(--color-muted)",
              textDecoration: "none", fontWeight: 500,
            }}>
              전체보기 →
            </Link>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "12px",
          }}>
            <BoardSection board="notice" />
            <BoardSection board="free" />
            <BoardSection board="feature" />
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────────── */}
      <section className="home-cta" style={{ padding: "52px 24px 72px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div className="home-cta-inner" style={{
            background: "linear-gradient(135deg, #1a1714 0%, #2d2b6b 50%, #1a1714 100%)",
            borderRadius: "20px",
            padding: "48px 48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
            flexWrap: "wrap",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Decorative gradient */}
            <div style={{
              position: "absolute", top: "-40px", right: "80px",
              width: "200px", height: "200px",
              background: "radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", bottom: "-20px", left: "60px",
              width: "160px", height: "160px",
              background: "radial-gradient(circle, rgba(58,58,239,0.12), transparent 70%)",
              pointerEvents: "none",
            }} />
            <div style={{ position: "relative" }}>
              <h2 style={{
                fontSize: "1.5rem", fontWeight: 700,
                letterSpacing: "-0.025em", color: "#fff",
                marginBottom: "8px",
              }}>
                지금 시작하세요
              </h2>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9375rem" }}>
                무료로 가입하고 통계·커스텀 도메인·API를 모두 이용하세요.
              </p>
            </div>
            <div className="home-cta-buttons" style={{ display: "flex", gap: "10px", flexWrap: "wrap", position: "relative" }}>
              <Link
                href="/register"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "12px 24px",
                  background: "#fff",
                  color: "var(--color-ink)",
                  borderRadius: "9999px",
                  textDecoration: "none",
                  fontSize: "0.9375rem",
                  fontWeight: 700,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.85")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
              >
                무료 가입
              </Link>
              <Link
                href="/login"
                style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "12px 24px",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  color: "#fff",
                  borderRadius: "9999px",
                  textDecoration: "none",
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.6)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.25)")}
              >
                로그인
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
