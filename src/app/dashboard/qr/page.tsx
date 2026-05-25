"use client";
import { useState, useEffect, useRef } from "react";
import { DownloadIcon } from "@/components/icons";

export default function QRPage() {
  const [url, setUrl] = useState("");
  const [color, setColor] = useState("#141413");
  const [bgColor, setBgColor] = useState("#FCFBFA");
  const [size, setSize] = useState(300);
  const [errorCorrection, setErrorCorrection] = useState<"L"|"M"|"Q"|"H">("M");
  const [svg, setSvg] = useState("");
  const [pngBase64, setPngBase64] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Pre-fill URL from query param
    const params = new URLSearchParams(window.location.search);
    const u = params.get("url");
    if (u) setUrl(u);
  }, []);

  useEffect(() => {
    if (!url) { setSvg(""); setPngBase64(""); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => generateQR(), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, color, bgColor, size, errorCorrection]);

  async function generateQR() {
    if (!url) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          style: { size, color, bgColor, errorCorrection },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSvg(data.svg);
        setPngBase64(data.png_base64);
      } else {
        const data = await res.json();
        setError(data.error ?? "QR 생성에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function downloadSVG() {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "qr-code.svg";
    a.click();
  }

  function downloadPNG() {
    const a = document.createElement("a");
    a.href = pngBase64;
    a.download = "qr-code.png";
    a.click();
  }

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "4px" }}>QR 코드 생성</h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>URL을 입력하고 QR 코드를 커스터마이즈하세요.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px" }}>
        {/* Settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>URL</h3>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/..."
              className="input"
            />
          </div>

          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "20px" }}>스타일 설정</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "8px" }}>전경색</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                    style={{ width: "40px", height: "40px", padding: "2px", border: "1px solid var(--color-hairline-strong)", borderRadius: "var(--radius-sm)", cursor: "pointer", background: "var(--color-lifted)" }} />
                  <input type="text" value={color} onChange={(e) => setColor(e.target.value)}
                    className="input" style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "8px" }}>배경색</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                    style={{ width: "40px", height: "40px", padding: "2px", border: "1px solid var(--color-hairline-strong)", borderRadius: "var(--radius-sm)", cursor: "pointer", background: "var(--color-lifted)" }} />
                  <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                    className="input" style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "8px" }}>크기 (px)</label>
                <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="input">
                  {[128, 256, 300, 400, 512, 1024].map((s) => (
                    <option key={s} value={s}>{s}×{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "8px" }}>오류 수정</label>
                <select value={errorCorrection} onChange={(e) => setErrorCorrection(e.target.value as "L"|"M"|"Q"|"H")} className="input">
                  <option value="L">L (저)</option>
                  <option value="M">M (중)</option>
                  <option value="Q">Q (상)</option>
                  <option value="H">H (최고)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div style={{ position: "sticky", top: "24px" }}>
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px", textAlign: "center" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>미리보기</h3>

            <div style={{
              background: "white", borderRadius: "var(--radius-lg)",
              padding: "16px", marginBottom: "16px",
              border: "1px solid var(--color-hairline)",
              minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {loading ? (
                <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>생성 중...</p>
              ) : svg ? (
                <div dangerouslySetInnerHTML={{ __html: svg }} style={{ maxWidth: "100%", height: "auto" }} />
              ) : (
                <p style={{ color: "var(--color-ash)", fontSize: "0.875rem" }}>URL을 입력하면 QR이 생성됩니다</p>
              )}
            </div>

            {error && (
              <p style={{ color: "var(--color-danger)", fontSize: "0.875rem", marginBottom: "12px" }}>{error}</p>
            )}

            {svg && (
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={downloadSVG} className="btn btn-secondary btn-sm btn-pill" style={{ flex: 1, justifyContent: "center", gap: "6px" }}>
                  <DownloadIcon size={14} />SVG
                </button>
                <button onClick={downloadPNG} className="btn btn-primary btn-sm btn-pill" style={{ flex: 1, justifyContent: "center", gap: "6px" }}>
                  <DownloadIcon size={14} />PNG
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
