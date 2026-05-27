"use client";
import { useState, useEffect, useRef } from "react";
import { UploadIcon, TrashIcon, CopyIcon, CheckIcon } from "@/components/icons";
import { formatBytes, formatDate, formatNumber } from "@/lib/utils";

interface FileData {
  id: string;
  slug: string;
  original_name: string;
  size: number;
  mime_type: string;
  expires_at: number | null;
  max_downloads: number | null;
  download_count: number;
  created_at: number;
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/v1/files")
      .then((r) => r.json())
      .then((d) => setFiles(d.files ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleUpload(file: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 10, 90));
      }, 200);

      const res = await fetch("/api/v1/files", { method: "POST", body: formData });
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (res.ok) {
        const data = await res.json();
        setFiles((prev) => [data, ...prev]);
        setTimeout(() => setUploadProgress(0), 1000);
      } else {
        const data = await res.json();
        setError(data.error ?? "업로드에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  async function handleCopy(slug: string) {
    await navigator.clipboard.writeText(`https://krl.kr/f/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  async function handleDelete(slug: string) {
    try {
      const res = await fetch(`/api/v1/files/${slug}`, { method: "DELETE" });
      if (res.ok) setFiles((prev) => prev.filter((f) => f.slug !== slug));
    } catch {}
    setDeleteConfirm(null);
  }

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "4px" }}>파일 공유</h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>파일을 업로드하고 공유 링크를 받으세요.</p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "var(--color-ink)" : "var(--color-hairline-strong)"}`,
          borderRadius: "var(--radius-xl)",
          padding: "48px",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? "var(--color-surface-card)" : "var(--color-lifted)",
          transition: "all 0.15s ease",
          marginBottom: "24px",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--color-surface-card)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--color-muted)" }}>
          <UploadIcon size={22} />
        </div>
        <p style={{ fontWeight: 600, marginBottom: "8px" }}>
          {uploading ? "업로드 중..." : "파일을 드래그하거나 클릭하세요"}
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
          로그인 없이 최대 100MB, 로그인 시 최대 1GB
        </p>
        {uploadProgress > 0 && (
          <div style={{ marginTop: "16px", height: "4px", background: "var(--color-surface-card)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${uploadProgress}%`, background: "var(--color-ink)", borderRadius: "var(--radius-pill)", transition: "width 0.2s ease" }} />
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "var(--radius-sm)", marginBottom: "20px", color: "#9B1C1C", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {/* Files table */}
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--color-hairline)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>내 파일 ({files.length})</h2>
        </div>
        {loading ? (
          <div style={{ padding: "64px", textAlign: "center", color: "var(--color-muted)" }}>로딩 중...</div>
        ) : files.length === 0 ? (
          <div style={{ padding: "64px", textAlign: "center" }}>
            <p style={{ fontWeight: 500, marginBottom: "8px" }}>업로드된 파일이 없습니다</p>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>위에서 파일을 업로드해보세요.</p>
          </div>
        ) : (
          <div className="table-wrap" style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>파일명</th>
                  <th>크기</th>
                  <th>다운로드</th>
                  <th>만료</th>
                  <th>업로드일</th>
                  <th style={{ textAlign: "right" }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id}>
                    <td>
                      <a href={`https://krl.kr/f/${file.slug}`} target="_blank" rel="noopener" style={{ fontWeight: 600, color: "var(--color-ink)", textDecoration: "none", display: "block" }}>
                        {file.original_name}
                      </a>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-arc)", fontFamily: "var(--font-mono)", cursor: "pointer" }}
                        onClick={() => handleCopy(file.slug)}
                        title="클릭하여 복사">
                        krl.kr/f/{file.slug}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.875rem" }}>{formatBytes(file.size)}</td>
                    <td style={{ fontSize: "0.875rem" }}>
                      {formatNumber(file.download_count)}
                      {file.max_downloads && <span style={{ color: "var(--color-muted)" }}> / {file.max_downloads}</span>}
                    </td>
                    <td style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                      {file.expires_at ? formatDate(file.expires_at) : "없음"}
                    </td>
                    <td style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                      {formatDate(file.created_at)}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                        <button onClick={() => handleCopy(file.slug)} className="btn btn-ghost btn-sm btn-icon" title="링크 복사">
                          {copiedSlug === file.slug ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                        </button>
                        <button onClick={() => setDeleteConfirm(file.slug)} className="btn btn-ghost btn-sm btn-icon" title="삭제" style={{ color: "var(--color-danger)" }}>
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,19,0.5)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "var(--color-lifted)", borderRadius: "var(--radius-xl)", padding: "32px", maxWidth: "400px", width: "100%", border: "1px solid var(--color-hairline-strong)" }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "12px" }}>파일 삭제</h3>
            <p style={{ color: "var(--color-muted)", marginBottom: "24px" }}>이 파일을 삭제하면 복구할 수 없습니다.</p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary btn-pill" style={{ flex: 1, justifyContent: "center" }}>취소</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn btn-pill" style={{ flex: 1, justifyContent: "center", background: "var(--color-danger)", color: "white", border: "none" }}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {copiedSlug && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "var(--color-ink)", color: "var(--color-canvas)", padding: "10px 16px", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px", zIndex: 100 }}>
          <CheckIcon size={16} />복사되었습니다
        </div>
      )}
    </div>
  );
}
