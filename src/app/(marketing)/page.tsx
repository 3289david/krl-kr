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
          boxShadow: "0 2px 12px rgba(20,20,19,0.06)", transition: "border-color 0.15s",
        }}
          onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--color-ink)")}
          onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--color-hairline-strong)")}
        >
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..." required
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              padding: "14px 18px", fontSize: "1rem", color: "var(--color-ink)",
              fontFamily: "var(--font-sans)",
            }}
          />
          <button type="submit" disabled={loading || !url.trim()} style={{
            padding: "14px 24px", background: "var(--color-ink)", color: "var(--color-canvas)",
            border: "none", cursor: loading || !url.trim() ? "default" : "pointer",
            fontSize: "0.9375rem", fontWeight: 600, fontFamily: "var(--font-sans)",
            opacity: loading || !url.trim() ? 0.6 : 1, flexShrink: 0, transition: "opacity 0.15s",
          }}>
            {loading ? "처리중..." : "단축하기"}
          </button>
        </div>
      </form>

      {error && (
        <div style={{ marginTop: "10px", padding: "10px 16px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "8px", fontSize: "0.875rem", color: "#9B1C1C" }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: "10px", padding: "14px 18px", background: "var(--color-white)",
          border: "1px solid var(--color-hairline-strong)", borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
          boxShadow: "0 2px 8px rgba(20,20,19,0.06)",
        }}>
          <a href={result.short} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "var(--font-mono)", fontSize: "1.0625rem", fontWeight: 700, color: "var(--color-ink)", textDecoration: "none" }}>
            {result.short}
          </a>
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button onClick={handleCopy} style={{
              padding: "7px 16px", borderRadius: "6px",
              border: "1px solid var(--color-hairline-strong)",
              background: copied ? "var(--color-ink)" : "var(--color-white)",
              color: copied ? "var(--color-canvas)" : "var(--color-ink)",
              cursor: "pointer", fontSize: "0.875rem", fontWeight: 600,
              fontFamily: "var(--font-sans)", transition: "all 0.15s",
            }}>
              {copied ? "✓ 복사됨" : "복사"}
            </button>
            <Link href="/dashboard/links" style={{
              padding: "7px 14px", borderRadius: "6px",
              background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)",
              color: "var(--color-body)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500,
            }}>
              통계 보기
            </Link>
          </div>
        </div>
      )}

      <p style={{ marginTop: "10px", fontSize: "0.8125rem", color: "var(--color-muted)", textAlign: "center" }}>
        로그인 없이 바로 사용 가능 &nbsp;·&nbsp;{" "}
        <Link href="/register" style={{ color: "var(--color-body)", textDecoration: "underline" }}>
          가입하면 통계·원하는 주소 설정 가능
        </Link>
      </p>
    </div>
  );
}

const TOOLS = [
  { href: "/qr", label: "QR 코드 생성기", desc: "PNG·SVG 다운로드, 색상·로고 변경", icon: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M17 17h.01 M17 21h.01 M21 17h.01 M21 21h.01" },
  { href: "/tools/drop", label: "파일 공유", desc: "파일 올리고 링크로 공유", icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" },
  { href: "/tools/paste", label: "코드·텍스트 공유", desc: "붙여넣고 링크로 공유, 만료 설정", icon: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" },
  { href: "/tools/webhook", label: "웹훅 테스트", desc: "HTTP 요청 실시간 확인·검사", icon: "M18 16.98h-5.99c-1.1 0-1.95.68-2.23 1.61A3 3 0 0 1 2 17c0-1.66 1.34-3 3-3h.5 M12 3C9.24 3 7 5.24 7 8c0 2.16 1.28 3.99 3.12 4.82" },
  { href: "/tools/bio", label: "Link-in-bio", desc: "krl.kr/@닉네임 프로필 링크 페이지", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { href: "/dashboard/subdomains", label: "서브도메인", desc: "내이름.krl.kr 주소 만들기", icon: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" },
];

export default function HomePage() {
  return (
    <>
      <section style={{ padding: "60px 24px 48px", textAlign: "center" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 600, letterSpacing: "-0.025em", marginBottom: "8px", color: "var(--color-ink)" }}>
            URL 단축기
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--color-muted)", marginBottom: "28px" }}>
            긴 주소를 짧은 <strong style={{ color: "var(--color-body)" }}>krl.kr</strong> 링크로 만드세요. 무료입니다.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ShortenForm />
          </div>
        </div>
      </section>

      <section style={{ padding: "0 24px 64px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: "14px" }}>
            다른 도구
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "10px" }}>
            {TOOLS.map((tool) => (
              <Link key={tool.href} href={tool.href} style={{
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                  style={{ color: "var(--color-muted)", flexShrink: 0, marginTop: "2px" }}>
                  <path d={tool.icon} />
                </svg>
                <div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-ink)", marginBottom: "2px" }}>{tool.label}</p>
                  <p style={{ fontSize: "0.775rem", color: "var(--color-muted)", lineHeight: 1.4 }}>{tool.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
