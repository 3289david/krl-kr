"use client";
import { useState, useEffect } from "react";

const COLORS = [
  { name: "blue", hex: "#007ec6" },
  { name: "brightgreen", hex: "#4c1" },
  { name: "green", hex: "#97ca00" },
  { name: "yellow", hex: "#dfb317" },
  { name: "orange", hex: "#fe7d37" },
  { name: "red", hex: "#e05d44" },
  { name: "blueviolet", hex: "#8a2be2" },
  { name: "pink", hex: "#e76db2" },
  { name: "grey", hex: "#555555" },
  { name: "lightgrey", hex: "#9f9f9f" },
];

const STYLES = ["flat", "flat-square", "for-the-badge"];

const PRESETS = [
  { label: "Visitors", message: "12,394", color: "blue" },
  { label: "Status", message: "Online", color: "brightgreen" },
  { label: "Version", message: "v1.2.3", color: "blueviolet" },
  { label: "License", message: "MIT", color: "green" },
  { label: "Build", message: "Passing", color: "brightgreen" },
  { label: "PRs", message: "Welcome", color: "orange" },
  { label: "Language", message: "TypeScript", color: "blue" },
  { label: "Stars", message: "⭐ 1.2k", color: "yellow" },
];

export default function BadgePage() {
  const [label, setLabel] = useState("Visitors");
  const [message, setMessage] = useState("12,394");
  const [color, setColor] = useState("blue");
  const [customColor, setCustomColor] = useState("");
  const [style, setStyle] = useState("flat");
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("https://krl.kr");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const badgeUrl = `${origin}/api/v1/badge?label=${encodeURIComponent(label)}&message=${encodeURIComponent(message)}&color=${encodeURIComponent(customColor || color)}&style=${style}`;
  const markdownCode = `![${label}](${badgeUrl})`;
  const htmlCode = `<img src="${badgeUrl}" alt="${label}: ${message}" />`;
  const urlCode = badgeUrl;

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const btn = (text: string, key: string, copyText: string) => (
    <button
      onClick={() => copy(copyText, key)}
      style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "10px 16px",
        background: copied === key ? "var(--color-accent)" : "var(--color-surface-card)",
        border: "1px solid var(--color-hairline)",
        borderRadius: "8px", cursor: "pointer",
        fontSize: "0.8125rem", fontWeight: 600,
        color: copied === key ? "#fff" : "var(--color-ink)",
        transition: "all 0.15s", whiteSpace: "nowrap",
      }}
    >
      {copied === key ? "✓ 복사됨" : text}
    </button>
  );

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: "780px" }}>
      <h1 style={{ fontSize: "clamp(1.25rem,3vw,1.5rem)", fontWeight: 700, marginBottom: "6px" }}>KRL Badge</h1>
      <p style={{ color: "var(--color-muted)", marginBottom: "32px", fontSize: "0.9375rem" }}>
        GitHub README, 문서에 붙일 수 있는 SVG 배지를 생성합니다.
      </p>

      {/* Presets */}
      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-muted)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>프리셋</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {PRESETS.map(p => (
            <button
              key={p.label + p.message}
              onClick={() => { setLabel(p.label); setMessage(p.message); setColor(p.color); setCustomColor(""); }}
              style={{
                padding: "6px 14px",
                border: "1px solid var(--color-hairline)",
                borderRadius: "20px", cursor: "pointer",
                background: "var(--color-surface-card)",
                fontSize: "0.8125rem", color: "var(--color-body)",
              }}
            >
              {p.label}: {p.message}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {/* Left: Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "6px" }}>레이블 (왼쪽)</label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value.slice(0, 50))}
                placeholder="예: Version"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", background: "var(--color-canvas)", fontSize: "0.9375rem", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "6px" }}>메시지 (오른쪽)</label>
              <input
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, 50))}
                placeholder="예: v1.2.3"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", background: "var(--color-canvas)", fontSize: "0.9375rem", boxSizing: "border-box" }}
              />
            </div>

            {/* Color */}
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "8px" }}>색상</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                {COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => { setColor(c.name); setCustomColor(""); }}
                    title={c.name}
                    style={{
                      width: "28px", height: "28px", borderRadius: "50%",
                      background: c.hex, border: color === c.name && !customColor ? "3px solid var(--color-ink)" : "2px solid transparent",
                      cursor: "pointer", outline: "none",
                    }}
                  />
                ))}
              </div>
              <input
                value={customColor}
                onChange={e => setCustomColor(e.target.value.replace(/[^a-fA-F0-9#]/g, "").slice(0, 7))}
                placeholder="커스텀 색상 (#ff6600)"
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", background: "var(--color-canvas)", fontSize: "0.875rem", boxSizing: "border-box" }}
              />
            </div>

            {/* Style */}
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "8px" }}>스타일</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {STYLES.map(s => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    style={{
                      padding: "7px 14px", border: `1.5px solid ${style === s ? "var(--color-accent)" : "var(--color-hairline)"}`,
                      borderRadius: "8px", background: style === s ? "var(--color-accent)" : "transparent",
                      color: style === s ? "#fff" : "var(--color-body)",
                      cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Preview + Code */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Preview */}
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "24px" }}>
            <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-muted)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>미리보기</p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-start", marginBottom: "16px" }}>
              {/* Dark background */}
              <div style={{ background: "#1a1a1a", padding: "16px 20px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={badgeUrl} alt="badge preview" />
              </div>
              {/* Light background */}
              <div style={{ background: "#f0f0f0", padding: "16px 20px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={badgeUrl} alt="badge preview" />
              </div>
            </div>
          </div>

          {/* Code */}
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>코드 복사</p>

            {[
              { label: "Markdown (GitHub README)", key: "md", code: markdownCode },
              { label: "HTML", key: "html", code: htmlCode },
              { label: "URL", key: "url", code: urlCode },
            ].map(item => (
              <div key={item.key}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-muted)" }}>{item.label}</span>
                  {btn("복사", item.key, item.code)}
                </div>
                <div style={{
                  background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)",
                  borderRadius: "8px", padding: "10px 12px",
                  fontFamily: "monospace", fontSize: "0.75rem",
                  color: "var(--color-body)", wordBreak: "break-all",
                  lineHeight: 1.5,
                }}>
                  {item.code}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic badges tip */}
      <div style={{
        marginTop: "24px", padding: "16px 20px",
        background: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)",
        borderRadius: "12px",
      }}>
        <p style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "4px" }}>동적 배지 팁</p>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", lineHeight: 1.6 }}>
          배지 URL을 내 서버에서 동적으로 생성하거나, 숫자를 포함한 메시지를 자동으로 업데이트하려면
          KRL API 키로 <code style={{ background: "var(--color-surface-card)", padding: "2px 6px", borderRadius: "4px" }}>message</code> 값을 바꿔서 리다이렉트하는 엔드포인트를 만드세요.
        </p>
      </div>
    </div>
  );
}
