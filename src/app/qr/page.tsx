"use client";
import { useState, useEffect, useRef } from "react";

export default function PublicQRPage() {
  const [url, setUrl] = useState("");
  const [size, setSize] = useState(300);
  const [color, setColor] = useState("#141413");
  const [bgColor, setBgColor] = useState("#FCFBFA");
  const [errorCorrection, setErrorCorrection] = useState<"L" | "M" | "Q" | "H">("M");
  const [svg, setSvg] = useState<string | null>(null);
  const [pngBase64, setPngBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!url) {
      setSvg(null);
      setPngBase64(null);
      setError("");
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/v1/qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, style: { size, color, bgColor, errorCorrection } }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "QR 생성 실패");
          setSvg(null);
          setPngBase64(null);
        } else {
          const data = await res.json();
          setSvg(data.svg);
          setPngBase64(data.png_base64);
        }
      } catch {
        setError("QR 생성 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [url, size, color, bgColor, errorCorrection]);

  function downloadSvg() {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "qr-code.svg";
    a.click();
  }

  function downloadPng() {
    if (!pngBase64) return;
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${pngBase64}`;
    a.download = "qr-code.png";
    a.click();
  }

  return (
    <main>
      <section className="section" style={{ paddingBottom: "48px" }}>
        <div className="container" style={{ maxWidth: "540px", textAlign: "center" }}>
          <p className="eyebrow" style={{ justifyContent: "center", marginBottom: "24px" }}>무료 도구</p>
          <h1 style={{ marginBottom: "16px" }}>QR 코드 생성기</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "1.0625rem" }}>
            URL을 입력하면 즉시 QR 코드가 생성됩니다. 회원가입 없이 무료로 사용하세요.
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: "96px" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", maxWidth: "900px", margin: "0 auto" }}>
            {/* Controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9375rem" }}>URL 주소</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9375rem" }}>전경색</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                      style={{ width: "44px", height: "40px", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-sm)", cursor: "pointer", padding: "2px" }} />
                    <input type="text" className="input" value={color} onChange={(e) => setColor(e.target.value)} style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "0.875rem" }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9375rem" }}>배경색</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                      style={{ width: "44px", height: "40px", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-sm)", cursor: "pointer", padding: "2px" }} />
                    <input type="text" className="input" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "0.875rem" }} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9375rem" }}>크기: {size}px</label>
                <input
                  type="range" min={100} max={600} step={50} value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "4px" }}>
                  <span>100px</span><span>600px</span>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "8px", fontSize: "0.9375rem" }}>오류 수정 레벨</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                  {(["L", "M", "Q", "H"] as const).map((ec) => (
                    <button
                      key={ec}
                      onClick={() => setErrorCorrection(ec)}
                      className={`btn btn-sm ${errorCorrection === ec ? "btn-primary" : "btn-secondary"}`}
                    >
                      {ec}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginTop: "8px" }}>
                  {errorCorrection === "L" ? "L — 낮음 (7%)" : errorCorrection === "M" ? "M — 중간 (15%)" : errorCorrection === "Q" ? "Q — 높음 (25%)" : "H — 최고 (30%)"}
                </p>
              </div>

              {svg && (
                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={downloadSvg} className="btn btn-secondary btn-pill" style={{ flex: 1 }}>SVG 다운로드</button>
                  <button onClick={downloadPng} className="btn btn-primary btn-pill" style={{ flex: 1 }}>PNG 다운로드</button>
                </div>
              )}
            </div>

            {/* Preview */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "360px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "32px" }}>
              {loading ? (
                <div style={{ textAlign: "center", color: "var(--color-muted)" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", opacity: 0.5 }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <p style={{ fontSize: "0.9rem" }}>생성 중...</p>
                </div>
              ) : error ? (
                <div style={{ textAlign: "center", color: "var(--color-danger)" }}>
                  <p style={{ fontSize: "0.9rem" }}>{error}</p>
                </div>
              ) : svg ? (
                <div
                  dangerouslySetInnerHTML={{ __html: svg }}
                  style={{ maxWidth: "100%", maxHeight: "400px" }}
                />
              ) : (
                <div style={{ textAlign: "center", color: "var(--color-ash)" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px" }}>
                    <rect width="5" height="5" x="3" y="3" rx="1" />
                    <rect width="5" height="5" x="16" y="3" rx="1" />
                    <rect width="5" height="5" x="3" y="16" rx="1" />
                    <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                    <path d="M21 21v.01" />
                    <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                    <path d="M3 12h.01" />
                    <path d="M12 3h.01" />
                    <path d="M12 16v.01" />
                    <path d="M16 12h1" />
                    <path d="M21 12v.01" />
                    <path d="M12 21v-1" />
                  </svg>
                  <p style={{ fontSize: "0.9375rem" }}>URL을 입력하면<br />QR 코드가 여기에 표시됩니다</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
