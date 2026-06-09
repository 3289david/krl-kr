"use client";
import { useState, useEffect } from "react";

const THEMES = [
  { name: "dark", label: "다크", bg: "#0f0f0f" },
  { name: "light", label: "라이트", bg: "#f8f8f8" },
  { name: "blue", label: "블루", bg: "#0a0a2e" },
  { name: "green", label: "그린", bg: "#0a1a0a" },
  { name: "purple", label: "퍼플", bg: "#1a0a2e" },
];

export default function OGPage() {
  const [title, setTitle] = useState("KRL.KR에 오신 것을 환영합니다");
  const [description, setDescription] = useState("무료 링크 단축, QR코드, 파일 호스팅 서비스");
  const [site, setSite] = useState("KRL.KR");
  const [tag, setTag] = useState("서비스 소개");
  const [theme, setTheme] = useState("dark");
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("https://krl.kr");

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const params = new URLSearchParams({
    title,
    ...(description ? { description } : {}),
    ...(site ? { site } : {}),
    ...(tag ? { tag } : {}),
    theme,
  });
  const imageUrl = `${origin}/api/og?${params.toString()}`;

  const metaTags = `<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${imageUrl}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${imageUrl}" />`;

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const inputStyle = {
    width: "100%", padding: "10px 12px",
    border: "1px solid var(--color-hairline)",
    borderRadius: "8px", background: "var(--color-canvas)",
    fontSize: "0.9375rem", boxSizing: "border-box" as const,
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block" as const,
    fontSize: "0.8125rem", fontWeight: 600,
    marginBottom: "6px",
  };

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: "900px" }}>
      <h1 style={{ fontSize: "clamp(1.25rem,3vw,1.5rem)", fontWeight: 700, marginBottom: "6px" }}>KRL OG Image</h1>
      <p style={{ color: "var(--color-muted)", marginBottom: "32px", fontSize: "0.9375rem" }}>
        소셜 미디어 링크 공유 시 노출되는 Open Graph 이미지를 생성합니다.
      </p>

      <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={labelStyle}>제목 *</label>
              <input value={title} onChange={e => setTitle(e.target.value.slice(0, 80))} placeholder="페이지 제목" style={inputStyle} />
              <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "4px" }}>{title.length}/80</p>
            </div>
            <div>
              <label style={labelStyle}>설명</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 140))}
                placeholder="페이지 설명"
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
              <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "4px" }}>{description.length}/140</p>
            </div>
            <div>
              <label style={labelStyle}>태그 (선택)</label>
              <input value={tag} onChange={e => setTag(e.target.value.slice(0, 30))} placeholder="예: 블로그, 제품 소개" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>사이트명</label>
              <input value={site} onChange={e => setSite(e.target.value.slice(0, 40))} placeholder="예: KRL.KR" style={inputStyle} />
            </div>

            {/* Theme */}
            <div>
              <label style={labelStyle}>테마</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {THEMES.map(t => (
                  <button
                    key={t.name}
                    onClick={() => setTheme(t.name)}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "7px 14px",
                      border: `1.5px solid ${theme === t.name ? "var(--color-accent)" : "var(--color-hairline)"}`,
                      borderRadius: "8px",
                      background: theme === t.name ? "var(--color-accent)" : "transparent",
                      color: theme === t.name ? "#fff" : "var(--color-body)",
                      cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500,
                    }}
                  >
                    <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: t.bg, border: "1px solid rgba(255,255,255,0.3)", display: "inline-block", flexShrink: 0 }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview + Code */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Preview */}
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "20px" }}>
            <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-muted)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>미리보기 (1200×630)</p>
            <div style={{ width: "100%", aspectRatio: "1200/630", overflow: "hidden", borderRadius: "8px", border: "1px solid var(--color-hairline)" }}>
              <img
                src={imageUrl}
                alt="OG image preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                key={imageUrl}
              />
            </div>
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                marginTop: "12px", fontSize: "0.8125rem", fontWeight: 600,
                color: "var(--color-accent)", textDecoration: "none",
              }}
            >
              원본 이미지 열기 →
            </a>
          </div>

          {/* Code */}
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>HTML 메타 태그</p>
              <button
                onClick={() => copy(metaTags, "meta")}
                style={{
                  padding: "8px 14px",
                  background: copied === "meta" ? "var(--color-accent)" : "var(--color-surface-card)",
                  border: "1px solid var(--color-hairline)",
                  borderRadius: "8px", cursor: "pointer",
                  fontSize: "0.8125rem", fontWeight: 600,
                  color: copied === "meta" ? "#fff" : "var(--color-ink)",
                }}
              >
                {copied === "meta" ? "✓ 복사됨" : "복사"}
              </button>
            </div>
            <pre style={{
              background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)",
              borderRadius: "8px", padding: "14px",
              fontFamily: "monospace", fontSize: "0.75rem",
              color: "var(--color-body)", overflowX: "auto",
              lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all",
              margin: 0,
            }}>
              {metaTags}
            </pre>

            <div style={{ marginTop: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-muted)" }}>이미지 URL</span>
                <button
                  onClick={() => copy(imageUrl, "url")}
                  style={{
                    padding: "6px 12px",
                    background: copied === "url" ? "var(--color-accent)" : "var(--color-surface-card)",
                    border: "1px solid var(--color-hairline)",
                    borderRadius: "6px", cursor: "pointer",
                    fontSize: "0.75rem", fontWeight: 600,
                    color: copied === "url" ? "#fff" : "var(--color-ink)",
                  }}
                >
                  {copied === "url" ? "✓ 복사됨" : "복사"}
                </button>
              </div>
              <div style={{
                background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)",
                borderRadius: "8px", padding: "10px 12px",
                fontFamily: "monospace", fontSize: "0.75rem",
                color: "var(--color-body)", wordBreak: "break-all",
              }}>
                {imageUrl}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
