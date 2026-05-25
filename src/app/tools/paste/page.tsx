"use client";
import { useState } from "react";
import Link from "next/link";

const LANGUAGES = [
  "plaintext", "javascript", "typescript", "python", "rust", "go",
  "java", "cpp", "c", "html", "css", "json", "yaml", "bash", "sql",
];

export default function PublicPastePage() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ slug: string; short_url: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) { setError("내용을 입력해주세요."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title: title || undefined, language, is_public: isPublic }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "저장 실패"); return; }
      setResult(data);
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (!result) return;
    navigator.clipboard.writeText(result.short_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function reset() {
    setResult(null);
    setContent("");
    setTitle("");
    setLanguage("plaintext");
    setCopied(false);
  }

  return (
    <main>
      <section className="section" style={{ paddingBottom: "48px" }}>
        <div className="container" style={{ maxWidth: "540px", textAlign: "center" }}>
          <p className="eyebrow" style={{ justifyContent: "center", marginBottom: "24px" }}>무료 도구</p>
          <h1 style={{ marginBottom: "16px" }}>Pastebin</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "1.0625rem" }}>
            코드나 텍스트를 붙여넣고 링크로 공유하세요. 로그인 없이 사용 가능합니다.
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: "96px" }}>
        <div className="container" style={{ maxWidth: "760px" }}>
          {result ? (
            <div style={{ textAlign: "center", padding: "48px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 20px" }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="M22 4 12 14.01l-3-3" />
              </svg>
              <h2 style={{ marginBottom: "8px" }}>페이스트가 생성되었습니다</h2>
              <p style={{ color: "var(--color-muted)", marginBottom: "28px" }}>아래 링크로 공유하세요.</p>
              <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
                <input
                  readOnly
                  value={result.short_url}
                  className="input"
                  style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}
                />
                <button onClick={copyLink} className="btn btn-primary btn-pill" style={{ minWidth: "90px" }}>
                  {copied ? "복사됨" : "복사"}
                </button>
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <Link href={`/p/${result.slug}`} className="btn btn-secondary btn-pill" style={{ textDecoration: "none" }} target="_blank">
                  페이스트 보기
                </Link>
                <button onClick={reset} className="btn btn-ghost btn-pill">새 페이스트</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "12px", alignItems: "end" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9375rem" }}>제목 (선택)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="제목 없음"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9375rem" }}>언어</label>
                  <select
                    className="input"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    style={{ cursor: "pointer" }}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div style={{ paddingBottom: "1px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.9375rem", paddingBottom: "10px" }}>
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                    />
                    공개
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9375rem" }}>내용</label>
                <textarea
                  className="input"
                  placeholder="코드 또는 텍스트를 입력하세요..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: "360px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.875rem",
                    lineHeight: 1.6,
                    resize: "vertical",
                  }}
                />
              </div>

              {error && (
                <p style={{ color: "var(--color-danger)", fontSize: "0.9rem" }}>{error}</p>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                  {content.length.toLocaleString("ko-KR")}자
                </p>
                <button type="submit" disabled={loading} className="btn btn-primary btn-pill btn-lg">
                  {loading ? "저장 중..." : "페이스트 생성"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
