"use client";
import Link from "next/link";
import { useState } from "react";

function ShortenForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ short: string; slug: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleShorten(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true); setError(""); setResult(null); setCopied(false);
    try {
      const res = await fetch("/api/v1/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
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
    <div style={{ width: "100%", maxWidth: "640px" }}>
      <form onSubmit={handleShorten}>
        <div style={{
          display: "flex", background: "var(--color-white)",
          border: "2px solid var(--color-hairline-strong)",
          borderRadius: "10px", overflow: "hidden",
          boxShadow: "0 2px 12px rgba(20,20,19,0.06)",
          transition: "border-color 0.15s",
        }}
          onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--color-ink)")}
          onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--color-hairline-strong)")}
        >
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            required
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              padding: "14px 18px", fontSize: "1rem", color: "var(--color-ink)",
              fontFamily: "var(--font-sans)",
            }}
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            style={{
              padding: "14px 24px", background: "var(--color-ink)", color: "var(--color-canvas)",
              border: "none", cursor: loading || !url.trim() ? "default" : "pointer",
              fontSize: "0.9375rem", fontWeight: 600, fontFamily: "var(--font-sans)",
              opacity: loading || !url.trim() ? 0.6 : 1,
              flexShrink: 0, transition: "opacity 0.15s",
            }}
          >
            {loading ? "처리중..." : "단축하기"}
          </button>
        </div>
      </form>

      {error && (
        <div style={{
          marginTop: "10px", padding: "10px 16px",
          background: "#FFF1F2", border: "1px solid #FECDD3",
          borderRadius: "8px", fontSize: "0.875rem", color: "#9B1C1C",
        }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: "10px", padding: "14px 18px",
          background: "var(--color-white)", border: "1px solid var(--color-hairline-strong)",
          borderRadius: "8px", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: "12px",
          boxShadow: "0 2px 8px rgba(20,20,19,0.06)",
        }}>
          <a
            href={result.short} target="_blank" rel="noopener noreferrer"
            style={{
              fontFamily: "var(--font-mono)", fontSize: "1.0625rem",
              fontWeight: 700, color: "var(--color-ink)", textDecoration: "none",
            }}
          >
            {result.short}
          </a>
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button
              onClick={handleCopy}
              style={{
                padding: "7px 16px", borderRadius: "6px", border: "1px solid var(--color-hairline-strong)",
                background: copied ? "var(--color-ink)" : "var(--color-white)",
                color: copied ? "var(--color-canvas)" : "var(--color-ink)",
                cursor: "pointer", fontSize: "0.875rem", fontWeight: 600,
                fontFamily: "var(--font-sans)", transition: "all 0.15s",
              }}
            >
              {copied ? "✓ 복사됨" : "복사"}
            </button>
            <Link
              href="/dashboard/links"
              style={{
                padding: "7px 14px", borderRadius: "6px",
                background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)",
                color: "var(--color-body)", textDecoration: "none",
                fontSize: "0.875rem", fontWeight: 500,
              }}
            >
              통계 보기
            </Link>
          </div>
        </div>
      )}

      <p style={{ marginTop: "10px", fontSize: "0.8125rem", color: "var(--color-muted)", textAlign: "center" }}>
        로그인 없이 바로 사용 가능 &nbsp;·&nbsp;{" "}
        <Link href="/register" style={{ color: "var(--color-body)", textDecoration: "underline" }}>
          가입하면 통계·커스텀 주소 사용 가능
        </Link>
      </p>
    </div>
  );
}

const TOOLS_LIST = [
  { href: "/qr", emoji: "⬛", title: "QR 코드 생성기", desc: "PNG·SVG 다운로드, 색상 변경" },
  { href: "/tools/paste", emoji: "📋", title: "코드·텍스트 공유", desc: "붙여넣고 링크로 공유" },
  { href: "/tools/drop", emoji: "📁", title: "파일 공유", desc: "파일 올리고 링크로 공유" },
  { href: "/tools/webhook", emoji: "🔔", title: "웹훅 테스트", desc: "HTTP 요청 실시간 확인" },
  { href: "/tools/bio", emoji: "👤", title: "Link-in-bio", desc: "프로필 링크 모음 페이지" },
  { href: "/dashboard/subdomains", emoji: "🌐", title: "서브도메인", desc: "내이름.krl.kr 주소" },
];

export default function HomePage() {
  return (
    <>
      {/* ─── 메인 단축기 ─────────────────────────────────────────── */}
      <section style={{ padding: "64px 24px 48px", textAlign: "center" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h1 style={{
            fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
            fontWeight: 600, letterSpacing: "-0.025em",
            marginBottom: "8px", color: "var(--color-ink)",
          }}>
            URL 단축기
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--color-muted)", marginBottom: "28px" }}>
            긴 주소를 짧은 <strong>krl.kr</strong> 링크로 만드세요. 무료입니다.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ShortenForm />
          </div>
        </div>
      </section>

      {/* ─── 기타 도구 ────────────────────────────────────────────── */}
      <section style={{ padding: "0 24px 64px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <p style={{
            fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em",
            textTransform: "uppercase", color: "var(--color-muted)", marginBottom: "16px",
          }}>
            다른 도구
          </p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "10px",
          }}>
            {TOOLS_LIST.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "12px",
                  padding: "16px", borderRadius: "10px", textDecoration: "none",
                  background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
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
                <span style={{ fontSize: "1.5rem", lineHeight: 1, flexShrink: 0 }}>{tool.emoji}</span>
                <div>
                  <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-ink)", marginBottom: "2px" }}>{tool.title}</p>
                  <p style={{ fontSize: "0.8rem", color: "var(--color-muted)", lineHeight: 1.4 }}>{tool.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 480px) {
          [style*="grid-template-columns"] { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </>
  );
}
