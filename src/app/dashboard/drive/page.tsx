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
  is_starred: boolean;
  deleted_at: number | null;
  download_count: number;
  created_at: number;
  updated_at: number;
}

interface StorageInfo { used: number; max: number; plan: string; extra_bytes?: number; }

type ViewMode = "my" | "recent" | "starred" | "trash";
type SortKey = "name" | "size" | "updated_at" | "created_at";
type LayoutMode = "list" | "grid";

const BMC_STORAGE_URL = "https://buymeacoffee.com/rukkitofficial/e/545645";

function FileIcon({ file, size = 20 }: { file: DriveFile; size?: number }) {
  if (file.type === "folder") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#f59e0b" stroke="#d97706" strokeWidth={1.5}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
  const mime = file.mime_type ?? "";
  if (mime.startsWith("image/")) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={1.5}>
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
  if (mime.startsWith("video/")) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth={1.5}>
      <rect x="2" y="2" width="20" height="20" rx="2" /><path d="M10 8l6 4-6 4V8z" />
    </svg>
  );
  if (mime.startsWith("audio/")) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth={1.5}>
      <path d="M9 18V5l12-2v13M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    </svg>
  );
  if (mime === "application/pdf") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={1.5}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6M9 9h1" />
    </svg>
  );
  if (mime.includes("zip") || mime.includes("archive") || mime.includes("compressed")) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={1.5}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M10 12h4M10 16h4M10 8h1" />
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={1.5}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" />
    </svg>
  );
}

function CtxMenu({ x, y, file, onClose, onRename, onShare, onStar, onTrash, onRestore, onDelete, onDownload }:
  { x: number; y: number; file: DriveFile; onClose: () => void; onRename: () => void; onShare: () => void;
    onStar: () => void; onTrash: () => void; onRestore: () => void; onDelete: () => void; onDownload: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const item = (label: string, icon: React.ReactNode, action: () => void, danger = false) => (
    <button key={label} onClick={() => { action(); onClose(); }}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: danger ? "#dc2626" : "var(--color-ink)", textAlign: "left" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--color-canvas)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; }}>
      {icon}{label}
    </button>
  );

  const iconProps = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 };

  return (
    <div ref={ref} style={{ position: "fixed", left: x, top: y, background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 500, minWidth: 180, padding: "4px 0", overflow: "hidden" }}>
      {file.deleted_at ? (
        <>
          {item("복원", <svg {...iconProps}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>, onRestore)}
          {item("영구 삭제", <svg {...iconProps}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>, onDelete, true)}
        </>
      ) : (
        <>
          {file.type === "file" && item("다운로드", <svg {...iconProps}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>, onDownload)}
          {item("공유", <svg {...iconProps}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" /></svg>, onShare)}
          {item("이름 변경", <svg {...iconProps}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>, onRename)}
          {item(file.is_starred ? "별표 해제" : "별표 추가", <svg {...iconProps}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>, onStar)}
          {item("휴지통으로 이동", <svg {...iconProps}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>, onTrash, true)}
        </>
      )}
    </div>
  );
}

function ShareModal({ file, onClose, onUnshare }: { file: DriveFile; onClose: () => void; onUnshare: (id: number) => void }) {
  const [shareUrl, setShareUrl] = useState(file.share_token ? `${typeof window !== "undefined" ? window.location.origin : ""}/drive/share/${file.share_token}` : "");
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState("");
  const [expireDays, setExpireDays] = useState("");
  const [creating, setCreating] = useState(!file.share_token);

  async function createShare() {
    setCreating(false);
    const body: Record<string, unknown> = {};
    if (password.trim()) body.password = password.trim();
    if (expireDays) body.expires_days = Number(expireDays);
    const res = await fetch(`/api/v1/drive/${file.id}/share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) setShareUrl(`${window.location.origin}/drive/share/${data.token}`);
  }

  async function copy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 16 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--color-surface)", borderRadius: 16, padding: 28, maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <FileIcon file={file} size={24} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: "1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{file.type === "folder" ? "폴더" : formatBytes(file.size)}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 4, borderRadius: 6 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {creating && !shareUrl ? (
          <div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: "0.8125rem", fontWeight: 500, display: "block", marginBottom: 6 }}>비밀번호 (선택)</label>
              <input className="input" placeholder="비밀번호 없음" value={password} onChange={e => setPassword(e.target.value)} style={{ width: "100%", height: 36 }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: "0.8125rem", fontWeight: 500, display: "block", marginBottom: 6 }}>만료 기간</label>
              <select className="input" value={expireDays} onChange={e => setExpireDays(e.target.value)} style={{ width: "100%", height: 36 }}>
                <option value="">만료 없음</option>
                <option value="1">1일</option>
                <option value="7">7일</option>
                <option value="30">30일</option>
                <option value="90">90일</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={onClose} className="btn btn-sm btn-ghost">취소</button>
              <button onClick={createShare} className="btn btn-sm btn-primary">링크 생성</button>
            </div>
          </div>
        ) : (
          <>
            {shareUrl ? (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <input className="input" value={shareUrl} readOnly style={{ flex: 1, fontSize: "0.8125rem", background: "var(--color-canvas)" }} />
                  <button onClick={copy} className="btn btn-sm btn-primary" style={{ whiteSpace: "nowrap" }}>
                    {copied ? "복사됨 ✓" : "복사"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { onUnshare(file.id); onClose(); }} className="btn btn-sm btn-ghost" style={{ color: "#dc2626" }}>공유 해제</button>
                  <div style={{ flex: 1 }} />
                  <button onClick={onClose} className="btn btn-sm btn-ghost">닫기</button>
                </div>
              </>
            ) : (
              <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>링크 생성 중...</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function DrivePage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [storage, setStorage] = useState<StorageInfo>({ used: 0, max: 5 * 1024 * 1024 * 1024, plan: "free" });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [view, setView] = useState<ViewMode>("my");
  const [layout, setLayout] = useState<LayoutMode>("list");
  const [sort, setSort] = useState<SortKey>("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [currentParent, setCurrentParent] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: number | null; name: string }>>([{ id: null, name: "내 드라이브" }]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameName, setRenameName] = useState("");
  const [shareFile, setShareFile] = useState<DriveFile | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; file: DriveFile } | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (view === "my" && currentParent != null) params.set("parent", String(currentParent));
      if (view !== "my") params.set("view", view);
      if (search) params.set("search", search);
      params.set("sort", sort);
      params.set("order", order);
      const res = await fetch(`/api/v1/drive?${params}`);
      const data = await res.json();
      setFiles(data.files ?? []);
      setStorage(data.storage ?? { used: 0, max: 5 * 1024 * 1024 * 1024, plan: "free" });
    } catch { setError("불러오기 실패"); }
    setLoading(false);
  }, [view, currentParent, search, sort, order]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(q: string) {
    setSearch(q);
    clearTimeout(searchTimer.current);
    if (!q) return;
    searchTimer.current = setTimeout(() => load(), 350);
  }

  async function uploadFiles(fileList: FileList) {
    setUploading(true); setError(""); setUploadProgress(0);
    const arr = Array.from(fileList);
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      const fd = new FormData();
      fd.append("file", file);
      if (currentParent != null) fd.append("parent_id", String(currentParent));
      await new Promise<void>(resolve => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/v1/drive");
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) {
            const fileBase = (i / arr.length) * 100;
            const fileChunk = (e.loaded / e.total) * (100 / arr.length);
            setUploadProgress(Math.round(fileBase + fileChunk));
          }
        };
        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            setFiles(prev => [data.file, ...prev]);
            setStorage(s => ({ ...s, used: s.used + file.size }));
          } else {
            try { const data = JSON.parse(xhr.responseText); setError(data.error ?? "업로드 실패"); } catch { setError("업로드 실패"); }
          }
          resolve();
        };
        xhr.onerror = () => { setError("업로드 오류"); resolve(); };
        xhr.send(fd);
      });
    }
    setUploading(false); setUploadProgress(0);
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    const res = await fetch("/api/v1/drive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName.trim(), parent_id: currentParent }),
    });
    const data = await res.json();
    if (res.ok) { setFiles(prev => [data.file, ...prev]); setNewFolderMode(false); setNewFolderName(""); }
  }

  async function handleRename(id: number, name: string) {
    if (!name.trim()) return;
    const res = await fetch(`/api/v1/drive/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
    if (res.ok) { setFiles(prev => prev.map(f => f.id === id ? { ...f, name: name.trim() } : f)); setRenameId(null); }
  }

  async function handleStar(id: number) {
    const file = files.find(f => f.id === id);
    if (!file) return;
    const next = !file.is_starred;
    setFiles(prev => prev.map(f => f.id === id ? { ...f, is_starred: next } : f));
    await fetch(`/api/v1/drive/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_starred: next }) });
    if (view === "starred") setFiles(prev => prev.filter(f => f.id !== id));
  }

  async function handleTrash(ids: number[]) {
    if (ids.length === 1) {
      await fetch(`/api/v1/drive/${ids[0]}`, { method: "DELETE" });
    } else {
      await fetch("/api/v1/drive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bulk_trash", ids }) });
    }
    setFiles(prev => prev.filter(f => !ids.includes(f.id)));
    setSelected(new Set());
  }

  async function handleRestore(id: number) {
    const res = await fetch(`/api/v1/drive/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore" }) });
    if (res.ok) setFiles(prev => prev.filter(f => f.id !== id));
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/v1/drive/${id}?permanent=1`, { method: "DELETE" });
    if (res.ok) {
      const file = files.find(f => f.id === id);
      setFiles(prev => prev.filter(f => f.id !== id));
      if (file?.size) setStorage(s => ({ ...s, used: Math.max(0, s.used - file.size) }));
    }
  }

  async function emptyTrash() {
    if (!confirm("휴지통을 비우시겠습니까? 복구할 수 없습니다.")) return;
    await fetch("/api/v1/drive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "empty_trash" }) });
    setFiles([]);
    load();
  }

  async function handleUnshare(id: number) {
    await fetch(`/api/v1/drive/${id}/share`, { method: "DELETE" });
    setFiles(prev => prev.map(f => f.id === id ? { ...f, share_token: null, is_shared: false } : f));
  }

  function openFolder(folder: DriveFile) {
    if (view !== "my") { setView("my"); setBreadcrumbs([{ id: null, name: "내 드라이브" }]); }
    setCurrentParent(folder.id);
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    setSelected(new Set());
  }

  function navigateBreadcrumb(idx: number) {
    const crumb = breadcrumbs[idx];
    setBreadcrumbs(prev => prev.slice(0, idx + 1));
    setCurrentParent(crumb.id);
    setSelected(new Set());
    setSearch("");
  }

  function switchView(v: ViewMode) {
    setView(v);
    setSelected(new Set());
    setSearch("");
    if (v === "my") {
      setBreadcrumbs([{ id: null, name: "내 드라이브" }]);
      setCurrentParent(null);
    }
  }

  function toggleSelect(id: number) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function selectAll() {
    if (selected.size === files.length) setSelected(new Set());
    else setSelected(new Set(files.map(f => f.id)));
  }

  function handleCtx(e: React.MouseEvent, file: DriveFile) {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, file });
  }

  const storagePercent = Math.min(100, (storage.used / storage.max) * 100);

  const viewLabels: Record<ViewMode, string> = { my: "내 드라이브", recent: "최근 항목", starred: "별표 항목", trash: "휴지통" };

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: "name", label: "이름" }, { value: "size", label: "크기" },
    { value: "updated_at", label: "수정일" }, { value: "created_at", label: "생성일" },
  ];

  return (
    <div className="dashboard-page" style={{ padding: 0, display: "flex", minHeight: "calc(100vh - 60px)" }}>
      <style>{`
        .drive-sidebar { width: 220px; flex-shrink: 0; padding: 20px 12px; border-right: 1px solid var(--color-hairline); }
        .drive-sidebar-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 0.875rem; color: var(--color-muted); transition: all 0.1s; border: none; background: none; width: 100%; text-align: left; }
        .drive-sidebar-item:hover { background: var(--color-canvas); color: var(--color-ink); }
        .drive-sidebar-item.active { background: var(--color-canvas); color: var(--color-ink); font-weight: 600; }
        .drive-main { flex: 1; padding: 24px; min-width: 0; }
        .drive-list-item { display: flex; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 8px; cursor: pointer; transition: background 0.1s; user-select: none; }
        .drive-list-item:hover { background: var(--color-canvas); }
        .drive-list-item.selected { background: #eff6ff; }
        .drive-grid-item { padding: 18px 12px 14px; background: var(--color-surface); border: 1.5px solid var(--color-hairline); border-radius: 12px; cursor: pointer; text-align: center; transition: box-shadow 0.15s, border-color 0.15s; }
        .drive-grid-item:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-color: var(--color-muted); }
        .drive-grid-item.selected { border-color: #3b82f6; background: #eff6ff; }
        .drive-header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        @media (max-width: 640px) { .drive-sidebar { display: none; } }
      `}</style>

      {/* Sidebar */}
      <div className="drive-sidebar">
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => { setNewFolderMode(true); setNewFolderName(""); switchView("my"); }}
            className="btn btn-primary" style={{ width: "100%", justifyContent: "center", gap: 8, marginBottom: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>
            새로 만들기
          </button>
        </div>

        {(["my", "recent", "starred", "trash"] as ViewMode[]).map(v => {
          const icons: Record<ViewMode, React.ReactNode> = {
            my: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>,
            recent: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
            starred: <svg width="16" height="16" viewBox="0 0 24 24" fill={v === "starred" && view === "starred" ? "#f59e0b" : "none"} stroke={view === "starred" ? "#f59e0b" : "currentColor"} strokeWidth={1.8}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
            trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2" /></svg>,
          };
          return (
            <button key={v} className={`drive-sidebar-item${view === v ? " active" : ""}`} onClick={() => switchView(v)}>
              {icons[v]}{viewLabels[v]}
            </button>
          );
        })}

        {/* Storage bar */}
        <div style={{ marginTop: "auto", paddingTop: 24, position: "sticky", bottom: 0 }}>
          <div style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
            <span>저장 공간</span>
            <span style={{ textTransform: "uppercase", fontWeight: 600 }}>{storage.plan}</span>
          </div>
          <div style={{ height: 5, background: "var(--color-hairline)", borderRadius: 3, marginBottom: 6 }}>
            <div style={{ height: "100%", borderRadius: 3, width: `${storagePercent}%`, background: storagePercent > 90 ? "#dc2626" : storagePercent > 70 ? "#f59e0b" : "#3b82f6", transition: "width 0.4s" }} />
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{formatBytes(storage.used)} / {formatBytes(storage.max)}</div>
          {storage.plan === "free" && (
            <a href={BMC_STORAGE_URL} target="_blank" rel="noreferrer"
              style={{ display: "block", marginTop: 10, padding: "6px 10px", borderRadius: 8, background: "#FFDD00", color: "#1a1714", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
              ☕ 저장공간 추가
            </a>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="drive-main"
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }}>

        {dragOver && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(59,130,246,0.12)", border: "3px dashed #3b82f6", borderRadius: 16, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ textAlign: "center" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={1.5} style={{ margin: "0 auto 12px", display: "block" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
              <div style={{ fontSize: "1.125rem", fontWeight: 600, color: "#3b82f6" }}>파일을 여기에 놓으세요</div>
            </div>
          </div>
        )}

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}<button onClick={() => setError("")} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer" }}>✕</button></div>}

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <h2 style={{ fontWeight: 700, fontSize: "1.125rem", margin: 0, letterSpacing: "-0.01em" }}>{viewLabels[view]}</h2>
          <div style={{ flex: 1 }} />
          <input className="input" placeholder="파일 검색..." value={search}
            onChange={e => handleSearch(e.target.value)}
            style={{ height: 34, width: 200, fontSize: "0.875rem" }} />
          <div className="drive-header-actions">
            <select className="input" value={`${sort}-${order}`} onChange={e => { const [s, o] = e.target.value.split("-"); setSort(s as SortKey); setOrder(o as "asc" | "desc"); }}
              style={{ height: 34, fontSize: "0.8125rem", paddingRight: 28 }}>
              {sortOptions.flatMap(opt => [
                <option key={`${opt.value}-asc`} value={`${opt.value}-asc`}>{opt.label} ↑</option>,
                <option key={`${opt.value}-desc`} value={`${opt.value}-desc`}>{opt.label} ↓</option>,
              ])}
            </select>
            <button onClick={() => setLayout(l => l === "list" ? "grid" : "list")} className="btn btn-ghost btn-sm" title={layout === "list" ? "그리드 보기" : "목록 보기"}>
              {layout === "list"
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>}
            </button>
            {view === "my" && (
              <>
                <button onClick={() => { setNewFolderMode(true); setNewFolderName(""); }} className="btn btn-ghost btn-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2zM12 11v6M9 14h6" /></svg>
                  새 폴더
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary btn-sm" disabled={uploading}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                  {uploading ? `${uploadProgress}%` : "업로드"}
                </button>
                <input ref={fileInputRef} type="file" multiple style={{ display: "none" }}
                  onChange={e => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }} />
              </>
            )}
            {view === "trash" && files.length > 0 && (
              <button onClick={emptyTrash} className="btn btn-sm" style={{ background: "#dc2626", color: "#fff" }}>
                휴지통 비우기
              </button>
            )}
          </div>
        </div>

        {/* Upload progress bar */}
        {uploading && (
          <div style={{ marginBottom: 16, background: "var(--color-surface)", borderRadius: 8, border: "1px solid var(--color-hairline)", padding: "10px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginBottom: 6 }}>
              <span>업로드 중...</span><span>{uploadProgress}%</span>
            </div>
            <div style={{ height: 4, background: "var(--color-hairline)", borderRadius: 2 }}>
              <div style={{ height: "100%", background: "#3b82f6", borderRadius: 2, width: `${uploadProgress}%`, transition: "width 0.2s" }} />
            </div>
          </div>
        )}

        {/* Breadcrumbs (My Drive only) */}
        {view === "my" && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
            {breadcrumbs.map((crumb, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {idx > 0 && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={2}><path d="M9 18l6-6-6-6" /></svg>}
                <button onClick={() => navigateBreadcrumb(idx)}
                  style={{ background: "none", border: "none", cursor: idx < breadcrumbs.length - 1 ? "pointer" : "default", padding: "2px 4px", borderRadius: 4, fontSize: "0.875rem", fontWeight: idx === breadcrumbs.length - 1 ? 600 : 400, color: idx < breadcrumbs.length - 1 ? "var(--color-muted)" : "var(--color-ink)" }}>
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New folder input */}
        {newFolderMode && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b" stroke="#d97706" strokeWidth={1.5}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
            <input autoFocus className="input" placeholder="폴더 이름" value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setNewFolderMode(false); }}
              style={{ maxWidth: 220, height: 34 }} />
            <button onClick={createFolder} className="btn btn-sm btn-primary">만들기</button>
            <button onClick={() => setNewFolderMode(false)} className="btn btn-sm btn-ghost">취소</button>
          </div>
        )}

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "8px 14px", background: "#eff6ff", borderRadius: 10, border: "1.5px solid #bfdbfe" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1d4ed8" }}>{selected.size}개 선택됨</span>
            <div style={{ flex: 1 }} />
            {view !== "trash" && (
              <button onClick={() => handleTrash(Array.from(selected))} className="btn btn-sm btn-ghost" style={{ color: "#dc2626" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                휴지통으로 이동
              </button>
            )}
            <button onClick={() => setSelected(new Set())} className="btn btn-sm btn-ghost">선택 해제</button>
          </div>
        )}

        {/* Files */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--color-muted)", fontSize: "0.9rem" }}>불러오는 중...</div>
        ) : files.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ marginBottom: 16 }}>
              {view === "trash" ? <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={1} style={{ margin: "0 auto" }}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                : view === "starred" ? <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={1} style={{ margin: "0 auto" }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                : <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={1} style={{ margin: "0 auto" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>}
            </div>
            <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>
              {view === "trash" ? "휴지통이 비어 있습니다" : view === "starred" ? "별표 항목이 없습니다" : view === "recent" ? "최근 항목이 없습니다" : search ? "검색 결과가 없습니다" : "파일을 드래그하거나 업로드 버튼을 눌러 시작하세요"}
            </p>
          </div>
        ) : layout === "list" ? (
          <div style={{ background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-hairline)", overflow: "hidden" }}>
            {/* List header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderBottom: "1px solid var(--color-hairline)", background: "var(--color-canvas)" }}>
              <input type="checkbox" checked={selected.size === files.length && files.length > 0} onChange={selectAll} style={{ width: 15, height: 15, cursor: "pointer" }} />
              <span style={{ flex: 1, fontSize: "0.75rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>이름</span>
              <span style={{ width: 80, fontSize: "0.75rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>크기</span>
              <span style={{ width: 130, fontSize: "0.75rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "none" } as React.CSSProperties}>수정일</span>
              <span style={{ width: 120 }} />
            </div>
            {files.map(file => (
              <div key={file.id} onContextMenu={e => handleCtx(e, file)}
                style={{ borderBottom: "1px solid var(--color-hairline)" }}>
                {renameId === file.id ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px" }}>
                    <FileIcon file={file} />
                    <input autoFocus className="input" value={renameName} onChange={e => setRenameName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleRename(file.id, renameName); if (e.key === "Escape") setRenameId(null); }}
                      style={{ flex: 1, height: 32 }} />
                    <button onClick={() => handleRename(file.id, renameName)} className="btn btn-sm btn-primary">저장</button>
                    <button onClick={() => setRenameId(null)} className="btn btn-sm btn-ghost">취소</button>
                  </div>
                ) : (
                  <div className={`drive-list-item${selected.has(file.id) ? " selected" : ""}`}
                    onDoubleClick={() => file.type === "folder" && openFolder(file)}
                    onClick={e => {
                      if ((e.target as HTMLElement).closest("button,a,input")) return;
                      if (file.type === "folder") openFolder(file);
                      else toggleSelect(file.id);
                    }}>
                    <input type="checkbox" checked={selected.has(file.id)} onChange={() => toggleSelect(file.id)}
                      onClick={e => e.stopPropagation()} style={{ width: 15, height: 15, cursor: "pointer", flexShrink: 0 }} />
                    <FileIcon file={file} />
                    <span style={{ flex: 1, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {file.name}
                    </span>
                    {file.is_starred && <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth={1.5}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>}
                    {file.is_shared && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" /></svg>}
                    <span style={{ width: 80, fontSize: "0.8125rem", color: "var(--color-muted)", textAlign: "right", flexShrink: 0 }}>
                      {file.type === "file" ? formatBytes(file.size) : "—"}
                    </span>
                    <div style={{ width: 120, display: "flex", gap: 2, justifyContent: "flex-end", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      {view === "trash" ? (
                        <>
                          <button onClick={() => handleRestore(file.id)} className="btn btn-ghost" style={{ padding: "4px 8px", height: "auto", fontSize: "0.75rem" }} title="복원">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                          </button>
                          <button onClick={() => handleDelete(file.id)} className="btn btn-ghost" style={{ padding: "4px 8px", height: "auto", color: "#dc2626" }} title="영구 삭제">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                          </button>
                        </>
                      ) : (
                        <>
                          {file.type === "file" && (
                            <a href={`/api/v1/drive/${file.id}/download`} className="btn btn-ghost" style={{ padding: "4px 8px", height: "auto" }} title="다운로드">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                            </a>
                          )}
                          <button onClick={() => setShareFile(file)} className="btn btn-ghost" style={{ padding: "4px 8px", height: "auto" }} title="공유">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" /></svg>
                          </button>
                          <button onClick={() => handleStar(file.id)} className="btn btn-ghost" style={{ padding: "4px 8px", height: "auto", color: file.is_starred ? "#f59e0b" : undefined }} title={file.is_starred ? "별표 해제" : "별표 추가"}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill={file.is_starred ? "#f59e0b" : "none"} stroke={file.is_starred ? "#f59e0b" : "currentColor"} strokeWidth={2}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                          </button>
                          <button onClick={() => { setRenameId(file.id); setRenameName(file.name); }} className="btn btn-ghost" style={{ padding: "4px 8px", height: "auto" }} title="이름 변경">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                          <button onClick={() => handleTrash([file.id])} className="btn btn-ghost" style={{ padding: "4px 8px", height: "auto", color: "#dc2626" }} title="삭제">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Grid view
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            {files.map(file => (
              <div key={file.id} className={`drive-grid-item${selected.has(file.id) ? " selected" : ""}`}
                onContextMenu={e => handleCtx(e, file)}
                onDoubleClick={() => file.type === "folder" && openFolder(file)}
                onClick={e => {
                  if ((e.target as HTMLElement).closest("button,a,input")) return;
                  if (file.type === "folder") openFolder(file);
                  else toggleSelect(file.id);
                }}>
                <div style={{ position: "relative", marginBottom: 10 }}>
                  <input type="checkbox" checked={selected.has(file.id)} onChange={() => toggleSelect(file.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ position: "absolute", top: -4, left: -4, width: 15, height: 15, cursor: "pointer" }} />
                  <FileIcon file={file} size={36} />
                  {file.is_starred && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth={1.5} style={{ position: "absolute", top: -4, right: -4 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                  )}
                </div>
                <div style={{ fontSize: "0.8125rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }} title={file.name}>{file.name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{file.type === "file" ? formatBytes(file.size) : "폴더"}</div>
                {view !== "trash" && (
                  <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: 8 }} onClick={e => e.stopPropagation()}>
                    {file.type === "file" && (
                      <a href={`/api/v1/drive/${file.id}/download`} className="btn btn-ghost" style={{ padding: "3px 6px", height: "auto", fontSize: "0.7rem" }}>↓</a>
                    )}
                    <button onClick={() => setShareFile(file)} className="btn btn-ghost" style={{ padding: "3px 6px", height: "auto", fontSize: "0.7rem" }}>공유</button>
                    <button onClick={() => handleTrash([file.id])} className="btn btn-ghost" style={{ padding: "3px 6px", height: "auto", color: "#dc2626", fontSize: "0.7rem" }}>삭제</button>
                  </div>
                )}
                {view === "trash" && (
                  <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: 8 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleRestore(file.id)} className="btn btn-ghost" style={{ padding: "3px 6px", height: "auto", fontSize: "0.7rem" }}>복원</button>
                    <button onClick={() => handleDelete(file.id)} className="btn btn-ghost" style={{ padding: "3px 6px", height: "auto", color: "#dc2626", fontSize: "0.7rem" }}>삭제</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <CtxMenu
          x={ctxMenu.x} y={ctxMenu.y} file={ctxMenu.file}
          onClose={() => setCtxMenu(null)}
          onRename={() => { setRenameId(ctxMenu.file.id); setRenameName(ctxMenu.file.name); }}
          onShare={() => setShareFile(ctxMenu.file)}
          onStar={() => handleStar(ctxMenu.file.id)}
          onTrash={() => handleTrash([ctxMenu.file.id])}
          onRestore={() => handleRestore(ctxMenu.file.id)}
          onDelete={() => handleDelete(ctxMenu.file.id)}
          onDownload={() => { window.location.href = `/api/v1/drive/${ctxMenu.file.id}/download`; }}
        />
      )}

      {/* Share modal */}
      {shareFile && (
        <ShareModal file={shareFile} onClose={() => setShareFile(null)} onUnshare={handleUnshare} />
      )}
    </div>
  );
}
