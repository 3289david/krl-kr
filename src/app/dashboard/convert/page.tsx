"use client";
import { useState, useRef } from "react";

const CONVERSIONS: Record<string, string[]> = {
  "image/jpeg": ["png", "webp"],
  "image/png": ["jpg", "webp"],
  "image/webp": ["jpg", "png"],
};

export default function ConvertPage() {
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState("");
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(f: File) {
    setFile(f);
    setResult(null);
    setError("");
    const formats = CONVERSIONS[f.type] ?? [];
    setTargetFormat(formats[0] ?? "");
  }

  async function convert() {
    if (!file || !targetFormat) return;
    setConverting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("target_format", targetFormat);
      const r = await fetch("/api/v1/convert", { method: "POST", body: fd });
      if (!r.ok) {
        const d = await r.json();
        setError(d.error ?? "변환에 실패했습니다.");
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const name = file.name.replace(/\.[^.]+$/, "") + "." + targetFormat;
      setResult({ url, name });
    } catch {
      setError("변환 중 오류가 발생했습니다.");
    } finally {
      setConverting(false);
    }
  }

  const formats = file ? (CONVERSIONS[file.type] ?? []) : [];

  return (
    <div style={{ padding: "32px", maxWidth: "600px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>KRL Convert</h1>
      <p style={{ color: "var(--color-muted)", marginBottom: "32px" }}>이미지 파일 변환 서비스</p>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        style={{ border: `2px dashed ${dragging ? "var(--color-accent)" : "var(--color-hairline)"}`, borderRadius: "16px", padding: "48px", textAlign: "center", cursor: "pointer", background: dragging ? "var(--color-surface-card)" : "transparent", transition: "all 0.15s", marginBottom: "20px" }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--color-muted)", marginBottom: "12px" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        {file ? (
          <div>
            <p style={{ fontWeight: 600, color: "var(--color-ink)" }}>{file.name}</p>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{(file.size / 1024).toFixed(1)} KB · {file.type}</p>
          </div>
        ) : (
          <div>
            <p style={{ fontWeight: 600, color: "var(--color-ink)", marginBottom: "4px" }}>파일을 드래그하거나 클릭해서 선택</p>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>JPG, PNG, WEBP 지원</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      {file && formats.length > 0 && (
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "8px" }}>변환 형식</label>
          <div style={{ display: "flex", gap: "8px" }}>
            {formats.map(fmt => (
              <button key={fmt} onClick={() => setTargetFormat(fmt)} style={{ padding: "8px 20px", border: `1.5px solid ${targetFormat === fmt ? "var(--color-accent)" : "var(--color-hairline)"}`, borderRadius: "8px", background: targetFormat === fmt ? "var(--color-accent)" : "transparent", color: targetFormat === fmt ? "white" : "var(--color-body)", cursor: "pointer", fontWeight: 600, textTransform: "uppercase" }}>
                {fmt}
              </button>
            ))}
          </div>
        </div>
      )}

      {file && formats.length === 0 && (
        <div style={{ padding: "12px 16px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "8px", marginBottom: "16px", color: "#9A3412", fontSize: "0.875rem" }}>
          이 파일 형식은 지원하지 않습니다.
        </div>
      )}

      {error && <div style={{ padding: "12px 16px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "8px", marginBottom: "16px", color: "#9B1C1C", fontSize: "0.875rem" }}>{error}</div>}

      {file && formats.length > 0 && (
        <button onClick={convert} disabled={converting || !targetFormat} style={{ width: "100%", padding: "12px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "1rem", fontWeight: 600 }}>
          {converting ? "변환 중..." : `${targetFormat.toUpperCase()}으로 변환`}
        </button>
      )}

      {result && (
        <div style={{ marginTop: "20px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
          <p style={{ fontWeight: 600, color: "#14532D", marginBottom: "12px" }}>변환 완료!</p>
          <a href={result.url} download={result.name} style={{ padding: "10px 24px", background: "#10b981", color: "white", textDecoration: "none", borderRadius: "8px", fontWeight: 600, fontSize: "0.9375rem" }}>
            {result.name} 다운로드
          </a>
        </div>
      )}
    </div>
  );
}
