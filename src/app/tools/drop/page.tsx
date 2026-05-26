"use client";
import { useState, useRef, useCallback } from "react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function PublicDropPage() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ slug: string; url: string; original_name: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 100 * 1024 * 1024; // 100MB for anonymous

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) selectFile(dropped);
  }, []);

  function selectFile(f: File) {
    if (f.size > MAX_SIZE) {
      setError(`파일 크기는 최대 100MB입니다. (현재: ${formatBytes(f.size)})`);
      return;
    }
    setFile(f);
    setError("");
    setResult(null);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    // Simulate progress since fetch doesn't support upload progress natively
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 85));
    }, 200);

    try {
      const res = await fetch("/api/v1/files", {
        method: "POST",
        body: formData,
      });
      clearInterval(progressInterval);
      setProgress(100);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "업로드 실패");
        setProgress(0);
      } else {
        setResult(data);
      }
    } catch {
      clearInterval(progressInterval);
      setError("업로드 중 오류가 발생했습니다.");
      setProgress(0);
    } finally {
      setUploading(false);
    }
  }

  function copyLink() {
    if (!result) return;
    navigator.clipboard.writeText(result.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function reset() {
    setFile(null);
    setResult(null);
    setProgress(0);
    setCopied(false);
    setError("");
  }

  return (
    <main>
      <section className="section" style={{ paddingBottom: "48px" }}>
        <div className="container" style={{ maxWidth: "540px", textAlign: "center" }}>
          <p className="eyebrow" style={{ justifyContent: "center", marginBottom: "24px" }}>무료 도구</p>
          <h1 style={{ marginBottom: "16px" }}>파일 공유</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "1.0625rem" }}>
            파일을 드래그하거나 선택해서 즉시 공유 링크를 만드세요. 로그인 없이 최대 100MB까지 가능합니다.
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: "96px" }}>
        <div className="container" style={{ maxWidth: "600px" }}>
          {result ? (
            <div style={{ textAlign: "center", padding: "48px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 20px" }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="M22 4 12 14.01l-3-3" />
              </svg>
              <h2 style={{ marginBottom: "8px" }}>업로드 완료</h2>
              <p style={{ color: "var(--color-muted)", marginBottom: "28px" }}>
                {result.original_name}이(가) 업로드되었습니다.
              </p>
              <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
                <input
                  readOnly
                  value={result.url}
                  className="input"
                  style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}
                />
                <button onClick={copyLink} className="btn btn-primary btn-pill" style={{ minWidth: "90px" }}>
                  {copied ? "복사됨" : "복사"}
                </button>
              </div>
              <button onClick={reset} className="btn btn-secondary btn-pill">새 파일 업로드</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !file && inputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? "var(--color-ink)" : "var(--color-hairline-strong)"}`,
                  borderRadius: "var(--radius-xl)",
                  padding: "64px 32px",
                  textAlign: "center",
                  cursor: file ? "default" : "pointer",
                  background: dragOver ? "var(--color-surface-card)" : "var(--color-lifted)",
                  transition: "all 0.15s",
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  style={{ display: "none" }}
                  onChange={(e) => { if (e.target.files?.[0]) selectFile(e.target.files[0]); }}
                />
                {file ? (
                  <div>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px" }}>
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <p style={{ fontWeight: 600, marginBottom: "4px" }}>{file.name}</p>
                    <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>{formatBytes(file.size)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); reset(); }}
                      style={{ marginTop: "12px", background: "none", border: "none", color: "var(--color-muted)", cursor: "pointer", fontSize: "0.875rem", textDecoration: "underline" }}
                    >
                      파일 변경
                    </button>
                  </div>
                ) : (
                  <div>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-ash)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px" }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" x2="12" y1="3" y2="15" />
                    </svg>
                    <p style={{ fontWeight: 600, marginBottom: "8px" }}>파일을 드래그하거나 클릭하여 선택</p>
                    <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>최대 100MB (로그인 시 1GB)</p>
                  </div>
                )}
              </div>

              {error && (
                <p style={{ color: "var(--color-danger)", fontSize: "0.9rem" }}>{error}</p>
              )}

              {uploading && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "6px" }}>
                    <span>업로드 중...</span>
                    <span>{progress}%</span>
                  </div>
                  <div style={{ height: "6px", background: "var(--color-hairline)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: "var(--color-ink)", borderRadius: "var(--radius-pill)", transition: "width 0.2s" }} />
                  </div>
                </div>
              )}

              {file && !uploading && (
                <button onClick={handleUpload} className="btn btn-primary btn-lg btn-pill" style={{ width: "100%" }}>
                  업로드 및 링크 생성
                </button>
              )}

              <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--color-muted)" }}>
                업로드된 파일은 기본 30일 후 자동 삭제됩니다.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
