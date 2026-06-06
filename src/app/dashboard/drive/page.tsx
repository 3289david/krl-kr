"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { formatBytes } from "@/lib/utils";

interface DriveFile {
  id: number;
  name: string;
  type: "file" | "folder";
  mime_type: string | null;
  size: number;
  parent_id: number | null;
  share_token: string | null;
  is_shared: boolean;
  created_at: number;
}

const BMC_STORAGE_URL = "https://buymeacoffee.com/rukkitofficial/e/545645";

interface StorageInfo { used: number; max: number; plan: string; extra_bytes?: number; }

function getFileIcon(file: DriveFile) {
  if (file.type === "folder") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b" stroke="#d97706" strokeWidth={1.5}>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  const mime = file.mime_type ?? "";
  if (mime.startsWith("image/")) return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={1.5}>
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
  if (mime.startsWith("video/")) return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth={1.5}>
      <rect x="2" y="2" width="20" height="20" rx="2" /><path d="M10 8l6 4-6 4V8z" />
    </svg>
  );
  if (mime.startsWith("audio/")) return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth={1.5}>
      <path d="M9 18V5l12-2v13 M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    </svg>
  );
  if (mime === "application/pdf") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={1.5}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 13h6 M9 17h6 M9 9h1" />
    </svg>
  );
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={1.5}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />
    </svg>
  );
}

function isPreviewable(mime: string | null) {
  if (!mime) return false;
  return mime.startsWith("image/") || mime === "text/plain" || mime === "application/pdf";
}

export default function DrivePage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [storage, setStorage] = useState<StorageInfo>({ used: 0, max: 5 * 1024 * 1024 * 1024, plan: "free" });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentParent, setCurrentParent] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: number | null; name: string }>>([{ id: null, name: "내 드라이브" }]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<DriveFile[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameName, setRenameName] = useState("");
  const [shareFile, setShareFile] = useState<DriveFile | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [copiedShare, setCopiedShare] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (parentId: number | null = currentParent) => {
    setLoading(true);
    try {
      const url = parentId != null ? `/api/v1/drive?parent=${parentId}` : `/api/v1/drive`;
      const res = await fetch(url);
      const data = await res.json();
      setFiles(data.files ?? []);
      setStorage(data.storage ?? { used: 0, max: 5 * 1024 * 1024 * 1024, plan: "free" });
    } catch {}
    setLoading(false);
  }, [currentParent]);

  useEffect(() => { load(); }, [load]);

  async function doSearch(q: string) {
    if (!q) { setSearchResults(null); return; }
    const res = await fetch(`/api/v1/drive?search=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSearchResults(data.files ?? []);
  }

  async function uploadFiles(fileList: FileList) {
    setUploading(true); setError("");
    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.append("file", file);
      if (currentParent != null) fd.append("parent_id", String(currentParent));
      try {
        const res = await fetch("/api/v1/drive", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) { setError(data.error); break; }
        setFiles(prev => [data.file, ...prev]);
        setStorage(s => ({ ...s, used: s.used + file.size }));
      } catch { setError("업로드 오류"); break; }
    }
    setUploading(false);
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    const res = await fetch("/api/v1/drive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName.trim(), parent_id: currentParent }),
    });
    const data = await res.json();
    if (res.ok) {
      setFiles(prev => [data.file, ...prev]);
      setNewFolderMode(false); setNewFolderName("");
    }
  }

  async function handleRename(id: number, name: string) {
    const res = await fetch(`/api/v1/drive/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setFiles(prev => prev.map(f => f.id === id ? { ...f, name } : f));
      setRenameId(null);
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/v1/drive/${id}`, { method: "DELETE" });
    if (res.ok) {
      const file = files.find(f => f.id === id);
      setFiles(prev => prev.filter(f => f.id !== id));
      if (file?.size) setStorage(s => ({ ...s, used: Math.max(0, s.used - file.size) }));
      setDeleteConfirm(null);
    }
  }

  async function handleShare(file: DriveFile) {
    setShareFile(file);
    if (file.share_token) {
      setShareUrl(`${window.location.origin}/drive/share/${file.share_token}`);
    } else {
      const res = await fetch(`/api/v1/drive/${file.id}/share`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setShareUrl(`${window.location.origin}/drive/share/${data.token}`);
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, share_token: data.token, is_shared: true } : f));
      }
    }
  }

  async function handleUnshare(id: number) {
    await fetch(`/api/v1/drive/${id}/share`, { method: "DELETE" });
    setFiles(prev => prev.map(f => f.id === id ? { ...f, share_token: null, is_shared: false } : f));
    setShareFile(null); setShareUrl("");
  }

  function openFolder(folder: DriveFile) {
    setCurrentParent(folder.id);
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    setSelected(new Set());
  }

  function navigateBreadcrumb(idx: number) {
    const crumb = breadcrumbs[idx];
    setBreadcrumbs(prev => prev.slice(0, idx + 1));
    setCurrentParent(crumb.id);
    setSelected(new Set());
    setSearchResults(null); setSearch("");
  }

  const displayFiles = searchResults ?? files;
  const storagePercent = Math.min(100, (storage.used / storage.max) * 100);

  return (
    <div className="dashboard-page">
      <style>{`
        .drive-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 8px; cursor: pointer; transition: background 0.1s; user-select: none; }
        .drive-item:hover { background: var(--color-canvas); }
        .drive-item.selected { background: #eff6ff; }
        .drive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
        .drive-grid-item { padding: 16px 12px; background: var(--color-surface); border: 1px solid var(--color-hairline); border-radius: 10px; cursor: pointer; text-align: center; transition: box-shadow 0.15s; }
        .drive-grid-item:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        .drive-grid-item.selected { border-color: #3b82f6; background: #eff6ff; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 4px" }}>KRL Drive</h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>파일을 안전하게 저장하고 공유하세요.</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}<button onClick={() => setError("")} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer" }}>✕</button></div>}

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          className="input"
          placeholder="파일 검색..."
          value={search}
          onChange={e => { setSearch(e.target.value); doSearch(e.target.value); }}
          style={{ maxWidth: 240, height: 36, fontSize: "0.875rem" }}
        />
        <div style={{ flex: 1 }} />
        <button onClick={() => { setNewFolderMode(true); setNewFolderName(""); }} className="btn btn-sm btn-ghost">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z M12 11v6 M9 14h6" />
          </svg>
          새 폴더
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="btn btn-sm btn-primary" disabled={uploading}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" />
          </svg>
          {uploading ? "업로드 중..." : "업로드"}
        </button>
        <input ref={fileInputRef} type="file" multiple style={{ display: "none" }}
          onChange={e => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }} />
      </div>

      {/* Breadcrumbs */}
      {!search && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {breadcrumbs.map((crumb, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {idx > 0 && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={2}><path d="M9 18l6-6-6-6" /></svg>}
              <button onClick={() => navigateBreadcrumb(idx)}
                style={{ background: "none", border: "none", cursor: idx < breadcrumbs.length - 1 ? "pointer" : "default", color: idx < breadcrumbs.length - 1 ? "var(--color-muted)" : "var(--color-ink)", fontSize: "0.875rem", fontWeight: idx === breadcrumbs.length - 1 ? 600 : 400, padding: 0 }}>
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New folder input */}
      {newFolderMode && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
          <input autoFocus className="input" placeholder="폴더 이름" value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setNewFolderMode(false); }}
            style={{ maxWidth: 220, height: 36 }} />
          <button onClick={createFolder} className="btn btn-sm btn-primary">만들기</button>
          <button onClick={() => setNewFolderMode(false)} className="btn btn-sm btn-ghost">취소</button>
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`drop-zone${dragOver ? " drag-over" : ""}`}
        style={{ marginBottom: 20, display: uploading ? "block" : displayFiles.length > 0 ? "none" : "block" }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={1.5} style={{ margin: "0 auto 12px" }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" />
        </svg>
        <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem", margin: 0 }}>
          {uploading ? "업로드 중..." : "파일을 여기에 끌어다 놓거나 클릭해서 선택하세요"}
        </p>
      </div>

      {/* File list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--color-muted)", fontSize: "0.875rem" }}>불러오는 중...</div>
      ) : (
        <div style={{ background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-hairline)", overflow: "hidden" }}>
          {displayFiles.length === 0 && !uploading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem" }}>
              {search ? "검색 결과가 없습니다" : "이 폴더는 비어있습니다"}
            </div>
          ) : (
            displayFiles.map(file => (
              <div key={file.id} style={{ borderBottom: "1px solid var(--color-hairline)" }}>
                {renameId === file.id ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px" }}>
                    <input autoFocus className="input" value={renameName} onChange={e => setRenameName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleRename(file.id, renameName); if (e.key === "Escape") setRenameId(null); }}
                      style={{ flex: 1, height: 34 }} />
                    <button onClick={() => handleRename(file.id, renameName)} className="btn btn-sm btn-primary">저장</button>
                    <button onClick={() => setRenameId(null)} className="btn btn-sm btn-ghost">취소</button>
                  </div>
                ) : (
                  <div className={`drive-item${selected.has(file.id) ? " selected" : ""}`}
                    onDoubleClick={() => file.type === "folder" ? openFolder(file) : undefined}
                    onClick={() => {
                      if (file.type === "folder") openFolder(file);
                      else setSelected(prev => {
                        const next = new Set(prev);
                        if (next.has(file.id)) next.delete(file.id); else next.add(file.id);
                        return next;
                      });
                    }}>
                    {getFileIcon(file)}
                    <span style={{ flex: 1, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {file.name}
                    </span>
                    {file.is_shared && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} title="공유됨">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v13" />
                      </svg>
                    )}
                    {file.type === "file" && <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", whiteSpace: "nowrap" }}>{formatBytes(file.size)}</span>}
                    <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                      {file.type === "file" && (
                        <a href={`/api/v1/drive/${file.id}/download`} className="btn btn-ghost" style={{ padding: "4px 8px", height: "auto", fontSize: "0.75rem" }} title="다운로드">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" /></svg>
                        </a>
                      )}
                      {file.type === "file" && (
                        <button onClick={() => handleShare(file)} className="btn btn-ghost" style={{ padding: "4px 8px", height: "auto", fontSize: "0.75rem" }} title="공유">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98 M15.41 6.51l-6.82 3.98" /></svg>
                        </button>
                      )}
                      <button onClick={() => { setRenameId(file.id); setRenameName(file.name); }} className="btn btn-ghost" style={{ padding: "4px 8px", height: "auto" }} title="이름 변경">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button onClick={() => setDeleteConfirm(file.id)} className="btn btn-ghost" style={{ padding: "4px 8px", height: "auto", color: "#dc2626" }} title="삭제">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M10 11v6 M14 11v6 M9 6V4h6v2" /></svg>
                      </button>
                    </div>
                  </div>
                )}
                {deleteConfirm === file.id && (
                  <div style={{ padding: "10px 14px", background: "#fef2f2", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: "0.875rem", color: "#991b1b", flex: 1 }}>"{file.name}" 을(를) 삭제하시겠습니까?</span>
                    <button onClick={() => handleDelete(file.id)} className="btn btn-sm" style={{ background: "#dc2626", color: "#fff" }}>삭제</button>
                    <button onClick={() => setDeleteConfirm(null)} className="btn btn-sm btn-ghost">취소</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Share modal */}
      {shareFile && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 16, padding: 28, maxWidth: 460, width: "100%" }}>
            <h3 style={{ fontWeight: 600, marginBottom: 8 }}>파일 공유</h3>
            <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", marginBottom: 20 }}>{shareFile.name}</p>
            {shareUrl ? (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input className="input" value={shareUrl} readOnly style={{ flex: 1, fontSize: "0.8125rem" }} />
                  <button onClick={async () => { await navigator.clipboard.writeText(shareUrl); setCopiedShare(true); setTimeout(() => setCopiedShare(false), 2000); }}
                    className="btn btn-sm btn-primary">
                    {copiedShare ? "복사됨!" : "복사"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleUnshare(shareFile.id)} className="btn btn-sm btn-ghost" style={{ color: "#dc2626" }}>공유 해제</button>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => { setShareFile(null); setShareUrl(""); }} className="btn btn-sm btn-ghost">닫기</button>
                </div>
              </>
            ) : (
              <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>공유 링크 생성 중...</p>
            )}
          </div>
        </div>
      )}

      {/* Storage bar */}
      <div style={{ marginTop: 24, padding: "14px 20px", background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-hairline)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>저장 공간</span>
          <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
            {formatBytes(storage.used)} / {formatBytes(storage.max)}
            {" · "}
            <span style={{ textTransform: "uppercase", fontWeight: 600 }}>{storage.plan}</span>
            {storage.plan === "free" && (
              <> · <a href="/pricing" style={{ color: "var(--color-ink)" }}>업그레이드</a></>
            )}
          </span>
        </div>
        <div style={{ height: 6, background: "var(--color-hairline)", borderRadius: 3 }}>
          <div style={{
            height: "100%", borderRadius: 3,
            width: `${storagePercent}%`,
            background: storagePercent > 90 ? "#dc2626" : storagePercent > 70 ? "#f59e0b" : "var(--color-ink)",
            transition: "width 0.5s",
          }} />
        </div>

        {/* Extra storage purchase banner */}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>저장공간이 부족한가요?</span>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginLeft: 6 }}>10GB 추가 — ₩2,900/월</span>
          </div>
          <a href={BMC_STORAGE_URL} target="_blank" rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, background: "#FFDD00", color: "#1a1714", fontSize: "0.8125rem", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
            ☕ 저장공간 10GB 추가
          </a>
        </div>
      </div>
    </div>
  );
}
