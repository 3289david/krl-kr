"use client";
import { useState, useEffect, use } from "react";

interface FileMeta {
  name: string;
  size: number;
  mime_type: string | null;
  type: string;
  created_at: number;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function FileIcon({ mime }: { mime: string | null }) {
  const m = mime ?? "";
  if (m.startsWith("image/")) return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={1.5}>
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
  if (m.startsWith("video/")) return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth={1.5}>
      <rect x="2" y="2" width="20" height="20" rx="2" /><path d="M10 8l6 4-6 4V8z" />
    </svg>
  );
  if (m.startsWith("audio/")) return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth={1.5}>
      <path d="M9 18V5l12-2v13 M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    </svg>
  );
  if (m === "application/pdf") return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={1.5}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 13h6 M9 17h6 M9 9h1" />
    </svg>
  );
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={1.5}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />
    </svg>
  );
}

export default function ShareFilePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/drive/share/${token}?meta=1`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then(d => { if (d) setMeta(d); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const downloadUrl = `/api/v1/drive/share/${token}`;
  const previewUrl = `/api/v1/drive/share/${token}?preview=1`;
  const isImage = meta?.mime_type?.startsWith("image/");
  const isText = meta?.mime_type === "text/plain";
  const isPdf = meta?.mime_type === "application/pdf";

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--color-canvas, #f9fafb)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 16px",
      fontFamily: "var(--font-sans, system-ui, sans-serif)",
    }}>
      <a href="/" style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <span style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--color-ink, #111)" }}>KRL<span style={{ color: "#2563eb" }}>.KR</span></span>
        <span style={{ fontSize: "0.8125rem", color: "#6b7280", fontWeight: 400 }}>Drive</span>
      </a>

      <div style={{
        background: "var(--color-surface, #fff)",
        border: "1px solid var(--color-hairline, #e5e7eb)",
        borderRadius: 16,
        padding: "36px 40px",
        maxWidth: 520,
        width: "100%",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#9ca3af", padding: "24px 0" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />
            </svg>
            불러오는 중...
          </div>
        ) : notFound || !meta ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5} style={{ margin: "0 auto 16px", display: "block" }}>
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4 M12 16h.01" />
            </svg>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: 8, color: "#111" }}>파일을 찾을 수 없습니다</h2>
            <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>공유가 해제되었거나 존재하지 않는 파일입니다.</p>
            <a href="/" style={{ display: "inline-block", marginTop: 20, color: "#2563eb", fontSize: "0.875rem", textDecoration: "none" }}>← KRL.KR로 돌아가기</a>
          </div>
        ) : (
          <>
            {/* File info */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
              <FileIcon mime={meta.mime_type} />
              <div style={{ overflow: "hidden" }}>
                <h2 style={{ fontSize: "1.0625rem", fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>
                  {meta.name}
                </h2>
                <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>
                  {formatBytes(meta.size)}
                  {meta.mime_type && <> · <span style={{ fontFamily: "monospace" }}>{meta.mime_type}</span></>}
                </p>
              </div>
            </div>

            {/* Image preview */}
            {isImage && (
              <div style={{ marginBottom: 24, borderRadius: 10, overflow: "hidden", border: "1px solid #e5e7eb", background: "#f3f4f6" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={meta.name}
                  style={{ display: "block", width: "100%", maxHeight: 320, objectFit: "contain" }}
                />
              </div>
            )}

            {/* PDF / text iframe preview */}
            {(isPdf || isText) && (
              <div style={{ marginBottom: 24, borderRadius: 10, overflow: "hidden", border: "1px solid #e5e7eb", height: 320 }}>
                <iframe src={previewUrl} style={{ width: "100%", height: "100%", border: "none" }} title={meta.name} />
              </div>
            )}

            {/* Download button */}
            <a
              href={downloadUrl}
              download={meta.name}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                width: "100%", padding: "12px 20px",
                background: "#2563eb", color: "#fff",
                borderRadius: 10, fontWeight: 600, fontSize: "0.9375rem",
                textDecoration: "none", transition: "background 0.15s",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" />
              </svg>
              다운로드
            </a>
          </>
        )}
      </div>

      <p style={{ marginTop: 24, fontSize: "0.8125rem", color: "#9ca3af" }}>
        공유 파일은 <a href="https://krl.kr" style={{ color: "#6b7280" }}>KRL Drive</a>로 제공됩니다
      </p>
    </div>
  );
}
