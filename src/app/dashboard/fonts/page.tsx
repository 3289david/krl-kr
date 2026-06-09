"use client";
import { useState, useEffect } from "react";

const POPULAR_FONTS = [
  { name: "Inter", weights: "100;200;300;400;500;600;700;800;900" },
  { name: "Roboto", weights: "100;300;400;500;700;900" },
  { name: "Noto Sans KR", weights: "100;300;400;500;700;900" },
  { name: "Pretendard Variable", weights: "100;200;300;400;500;600;700;800;900" },
  { name: "Geist", weights: "100;200;300;400;500;600;700;800;900" },
  { name: "Open Sans", weights: "300;400;500;600;700;800" },
  { name: "Lato", weights: "100;300;400;700;900" },
  { name: "Poppins", weights: "100;200;300;400;500;600;700;800;900" },
  { name: "Montserrat", weights: "100;200;300;400;500;600;700;800;900" },
  { name: "Source Code Pro", weights: "200;300;400;500;600;700;800;900" },
  { name: "Merriweather", weights: "300;400;700;900" },
  { name: "Playfair Display", weights: "400;500;600;700;800;900" },
];

const WEIGHT_NAMES: Record<string, string> = {
  "100": "Thin",
  "200": "ExtraLight",
  "300": "Light",
  "400": "Regular",
  "500": "Medium",
  "600": "SemiBold",
  "700": "Bold",
  "800": "ExtraBold",
  "900": "Black",
};

export default function FontsPage() {
  const [selected, setSelected] = useState("Inter");
  const [selectedWeights, setSelectedWeights] = useState(["400", "700"]);
  const [display, setDisplay] = useState("swap");
  const [previewText, setPreviewText] = useState("안녕하세요! Hello, World! 123");
  const [previewSize, setPreviewSize] = useState(24);
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("https://krl.kr");
  const [loadedFont, setLoadedFont] = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const font = POPULAR_FONTS.find(f => f.name === selected) ?? POPULAR_FONTS[0];
  const allWeights = font.weights.split(";");

  function toggleWeight(w: string) {
    setSelectedWeights(prev =>
      prev.includes(w) ? (prev.length > 1 ? prev.filter(x => x !== w) : prev) : [...prev, w].sort()
    );
  }

  // Build the font family param for Google Fonts
  const familyParam = `${selected}:wght@${selectedWeights.join(";")}`;
  const cssUrl = `${origin}/api/fonts?family=${encodeURIComponent(familyParam)}&display=${display}`;
  const htmlLinkTag = `<link rel="preconnect" href="${origin}" />\n<link rel="stylesheet" href="${cssUrl}" />`;
  const cssImport = `@import url('${cssUrl}');`;
  const cssUsage = `body {\n  font-family: '${selected}', sans-serif;\n}`;

  // Load the font for preview
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@import url('${cssUrl}');`;
    document.head.appendChild(style);
    setLoadedFont(selected);
    return () => { document.head.removeChild(style); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cssUrl]);

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copy(text, id)}
      style={{
        padding: "6px 12px",
        background: copied === id ? "var(--color-accent)" : "var(--color-surface-card)",
        border: "1px solid var(--color-hairline)",
        borderRadius: "6px", cursor: "pointer",
        fontSize: "0.75rem", fontWeight: 600,
        color: copied === id ? "#fff" : "var(--color-ink)",
        flexShrink: 0,
      }}
    >
      {copied === id ? "✓ 복사됨" : "복사"}
    </button>
  );

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: "900px" }}>
      <h1 style={{ fontSize: "clamp(1.25rem,3vw,1.5rem)", fontWeight: 700, marginBottom: "6px" }}>KRL Fonts CDN</h1>
      <p style={{ color: "var(--color-muted)", marginBottom: "8px", fontSize: "0.9375rem" }}>
        무료 웹폰트 CDN — Google Fonts를 KRL 서버를 통해 제공합니다.
      </p>
      <div style={{
        display: "inline-block", marginBottom: "28px", padding: "4px 12px",
        background: "color-mix(in srgb, #22c55e 12%, transparent)",
        border: "1px solid color-mix(in srgb, #22c55e 30%, transparent)",
        borderRadius: "20px", fontSize: "0.8125rem", color: "#166534",
      }}>
        무료 · 무제한 · 인증 불필요
      </div>

      <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {/* Left: Font picker */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Font selection */}
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "20px" }}>
            <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>폰트 선택</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "300px", overflowY: "auto" }}>
              {POPULAR_FONTS.map(f => (
                <button
                  key={f.name}
                  onClick={() => { setSelected(f.name); setSelectedWeights(["400", "700"]); }}
                  style={{
                    padding: "10px 12px", textAlign: "left",
                    border: `1px solid ${selected === f.name ? "var(--color-accent)" : "transparent"}`,
                    borderRadius: "8px", cursor: "pointer",
                    background: selected === f.name ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
                    fontSize: "0.875rem",
                    color: selected === f.name ? "var(--color-accent)" : "var(--color-body)",
                    fontWeight: selected === f.name ? 700 : 400,
                  }}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* Weight selection */}
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "20px" }}>
            <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>굵기 선택</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {allWeights.map(w => (
                <button
                  key={w}
                  onClick={() => toggleWeight(w)}
                  style={{
                    padding: "7px 12px",
                    border: `1.5px solid ${selectedWeights.includes(w) ? "var(--color-accent)" : "var(--color-hairline)"}`,
                    borderRadius: "8px", cursor: "pointer",
                    background: selectedWeights.includes(w) ? "var(--color-accent)" : "transparent",
                    color: selectedWeights.includes(w) ? "#fff" : "var(--color-body)",
                    fontSize: "0.8125rem",
                  }}
                >
                  {w} <span style={{ opacity: 0.7, fontSize: "0.7rem" }}>{WEIGHT_NAMES[w]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Display setting */}
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "16px 20px" }}>
            <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>font-display</p>
            <div style={{ display: "flex", gap: "6px" }}>
              {["swap", "optional", "fallback", "block"].map(d => (
                <button
                  key={d}
                  onClick={() => setDisplay(d)}
                  style={{
                    padding: "6px 12px",
                    border: `1.5px solid ${display === d ? "var(--color-accent)" : "var(--color-hairline)"}`,
                    borderRadius: "6px", cursor: "pointer",
                    background: display === d ? "var(--color-accent)" : "transparent",
                    color: display === d ? "#fff" : "var(--color-body)",
                    fontSize: "0.75rem",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preview + Code */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Preview */}
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>미리보기</p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>크기</span>
                <input
                  type="range" min={12} max={72} value={previewSize}
                  onChange={e => setPreviewSize(Number(e.target.value))}
                  style={{ width: "80px" }}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", minWidth: "30px" }}>{previewSize}px</span>
              </div>
            </div>
            <input
              value={previewText}
              onChange={e => setPreviewText(e.target.value)}
              style={{
                width: "100%", padding: "8px 12px",
                border: "1px solid var(--color-hairline)", borderRadius: "8px",
                background: "var(--color-canvas)", marginBottom: "16px",
                fontSize: "0.875rem", boxSizing: "border-box",
              }}
              placeholder="미리보기 텍스트 입력..."
            />
            {selectedWeights.map(w => (
              <div key={w} style={{ marginBottom: "12px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--color-muted)", display: "block", marginBottom: "4px" }}>
                  {w} — {WEIGHT_NAMES[w]}
                </span>
                <div style={{
                  fontFamily: `'${loadedFont || selected}', sans-serif`,
                  fontWeight: Number(w),
                  fontSize: `${previewSize}px`,
                  lineHeight: 1.3,
                  color: "var(--color-ink)",
                  wordBreak: "break-word",
                }}>
                  {previewText}
                </div>
              </div>
            ))}
          </div>

          {/* Code */}
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>사용 코드</p>

            {[
              { label: "HTML <link> 태그", id: "link", code: htmlLinkTag },
              { label: "CSS @import", id: "import", code: cssImport },
              { label: "CSS 적용", id: "css", code: cssUsage },
            ].map(item => (
              <div key={item.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-muted)" }}>{item.label}</span>
                  <CopyBtn text={item.code} id={item.id} />
                </div>
                <pre style={{
                  background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)",
                  borderRadius: "8px", padding: "10px 12px",
                  fontFamily: "monospace", fontSize: "0.7rem",
                  color: "var(--color-body)", overflowX: "auto",
                  lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all",
                  margin: 0,
                }}>
                  {item.code}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
