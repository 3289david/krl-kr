"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { formatBytes } from "@/lib/utils";
import HlsPlayer from "@/components/HlsPlayer";

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
interface StorageInfo { used: number; max: number; plan: string; }
type ViewMode = "my" | "recent" | "starred" | "trash";
type SortKey = "name" | "size" | "updated_at" | "created_at";
type Layout = "list" | "grid";

const BMC_URL = "https://buymeacoffee.com/rukkitofficial/e/545645";

/* ─── 파일 아이콘 ─────────────────────────────────────────── */
function FileIcon({ file, size = 18 }: { file: DriveFile; size?: number }) {
  const s = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", strokeWidth: 1.5 } as const;
  if (file.type === "folder") return <svg {...s} fill="#f59e0b" stroke="#d97706"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
  const m = file.mime_type ?? "";
  if (m.startsWith("image/")) return <svg {...s} stroke="#3b82f6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>;
  if (m.startsWith("video/")) return <svg {...s} stroke="#8b5cf6"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M10 8l6 4-6 4V8z"/></svg>;
  if (m.startsWith("audio/")) return <svg {...s} stroke="#ec4899"><path d="M9 18V5l12-2v13M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>;
  if (m === "application/pdf") return <svg {...s} stroke="#ef4444"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6"/></svg>;
  if (m.includes("zip") || m.includes("archive")) return <svg {...s} stroke="#f59e0b"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6"/><path d="M10 12h4M10 16h4"/></svg>;
  return <svg {...s} stroke="#94a3b8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6"/></svg>;
}

/* ─── 미리보기 타입 판별 ──────────────────────────────────── */
const TEXT_EXTS = new Set(["txt","md","mdx","markdown","csv","tsv","log","ini","cfg","conf","env","gitignore","gitattributes","editorconfig","toml","yaml","yml","json","json5","jsonc","xml","html","htm","xhtml","svg","css","scss","sass","less","js","mjs","cjs","jsx","ts","tsx","vue","svelte","astro","py","rb","php","java","kt","kts","go","rs","c","h","cpp","hpp","cc","cs","swift","m","sh","bash","zsh","fish","ps1","bat","cmd","sql","graphql","gql","r","rmd","ipynb","tex","bib","gradle","makefile","dockerfile","docker-compose","nginx","htaccess","properties","plist","nix","lua","vim","el","clj","cljs","edn","scala","hs","ml","fs","fsx","fsi","elm","ex","exs","erl","hrl","dart","zig","v","odin","d","pas","pp","vb","asm","s","proto","thrift","avsc","wasm","wat"]);
const IMG_MIME = new Set(["image/jpeg","image/png","image/gif","image/webp","image/avif","image/svg+xml","image/bmp","image/tiff","image/x-icon","image/heic","image/heif"]);
const VID_MIME = new Set(["video/mp4","video/webm","video/ogg","video/quicktime","video/x-msvideo","video/x-matroska","video/3gpp","video/mpeg"]);
const AUD_MIME = new Set(["audio/mpeg","audio/ogg","audio/wav","audio/webm","audio/aac","audio/flac","audio/x-flac","audio/mp4","audio/opus"]);

function getPreviewType(file: DriveFile): "image"|"video"|"audio"|"pdf"|"text"|"iframe"|"none" {
  const mime = file.mime_type ?? "";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (IMG_MIME.has(mime) || mime.startsWith("image/")) return "image";
  if (VID_MIME.has(mime) || mime.startsWith("video/")) return "video";
  if (AUD_MIME.has(mime) || mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("text/") || mime === "application/json" || mime === "application/xml"
    || mime === "application/javascript" || mime === "application/typescript"
    || mime === "application/x-yaml" || mime === "application/toml"
    || TEXT_EXTS.has(ext)) return "text";
  return "none";
}

/* ─── 파일 미리보기 모달 ─────────────────────────────────── */
function PreviewModal({ file, onClose }: { file: DriveFile; onClose: () => void }) {
  const src = `/api/v1/drive/${file.id}/download?preview=1`;
  const type = getPreviewType(file);
  const [txt, setTxt] = useState<string | null>(null);
  const isWide = type === "pdf" || type === "text" || type === "iframe";

  useEffect(() => {
    if (type === "text") fetch(src).then(r => r.text()).then(t => setTxt(t.slice(0, 500_000))).catch(() => setTxt("파일을 불러올 수 없습니다."));
  }, [src, type]);

  // Esc 키로 닫기
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 700, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--color-surface)", borderRadius: 14, overflow: "hidden", maxWidth: isWide ? "min(92vw,860px)" : "min(92vw,680px)", maxHeight: "92vh", width: "100%", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,.5)" }}>
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderBottom: "1px solid var(--color-hairline)", flexShrink: 0 }}>
          <FileIcon file={file} size={18} />
          <span style={{ flex: 1, fontWeight: 600, fontSize: ".9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
          <a href={`/api/v1/drive/${file.id}/download`} className="btn btn-sm btn-ghost" style={{ flexShrink: 0 }}>↓ 다운로드</a>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "1.1rem", lineHeight: 1, padding: "3px 6px", borderRadius: 6 }}>✕</button>
        </div>
        {/* 컨텐츠 */}
        <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: type === "image" || type === "video" || type === "audio" ? "center" : "flex-start", justifyContent: "center", background: type === "image" ? "#0a0a0a" : undefined }}>
          {type === "image" && (
            <img src={src} alt={file.name} style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", display: "block" }} />
          )}
          {type === "video" && (
            <HlsPlayer
              src={src}
              hlsSrc={`/api/v1/hls/drive/${file.id}/playlist.m3u8`}
              style={{ maxWidth: "100%", maxHeight: "80vh", width: "100%" }}
            />
          )}
          {type === "audio" && (
            <div style={{ padding: 48, textAlign: "center", width: "100%" }}>
              <FileIcon file={file} size={56} />
              <div style={{ margin: "16px 0", fontWeight: 500, fontSize: ".9375rem" }}>{file.name}</div>
              <audio src={src} controls style={{ width: "100%", maxWidth: 380 }} />
            </div>
          )}
          {type === "pdf" && (
            <iframe src={src} style={{ width: "100%", height: "80vh", border: "none" }} title={file.name} />
          )}
          {type === "text" && (
            <pre style={{ margin: 0, padding: "20px 24px", width: "100%", fontSize: ".8125rem", fontFamily: "'JetBrains Mono',monospace,ui-monospace", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all", color: "var(--color-ink)", overflowWrap: "anywhere" }}>
              {txt === null ? "불러오는 중..." : txt}
            </pre>
          )}
          {type === "none" && (
            <div style={{ padding: 56, textAlign: "center" }}>
              <FileIcon file={file} size={56} />
              <div style={{ marginTop: 16, color: "var(--color-muted)", fontSize: ".9rem", marginBottom: 24 }}>
                이 파일 형식은 미리보기를 지원하지 않습니다.<br />
                <span style={{ fontSize: ".8rem" }}>{file.mime_type ?? "알 수 없는 형식"}</span>
              </div>
              <a href={`/api/v1/drive/${file.id}/download`} className="btn btn-primary">다운로드</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 공유 모달 ───────────────────────────────────────────── */
function ShareModal({ file, onClose, onUnshare }: { file: DriveFile; onClose: () => void; onUnshare: (id: number) => void }) {
  const [url, setUrl] = useState(file.share_token ? `${window.location.origin}/drive/share/${file.share_token}` : "");
  const [copied, setCopied] = useState(false);
  const [pw, setPw] = useState("");
  const [days, setDays] = useState("");
  const [step, setStep] = useState<"form" | "done">(file.share_token ? "done" : "form");

  async function create() {
    const body: Record<string, unknown> = {};
    if (pw.trim()) body.password = pw.trim();
    if (days) body.expires_days = Number(days);
    const res = await fetch(`/api/v1/drive/${file.id}/share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) { setUrl(`${window.location.origin}/drive/share/${data.token}`); setStep("done"); }
  }
  async function copy() { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: "24px 28px", width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <FileIcon file={file} size={22} />
          <span style={{ flex: 1, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", lineHeight: 1 }}>✕</button>
        </div>
        {step === "form" ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: ".8125rem", fontWeight: 500, display: "block", marginBottom: 5 }}>비밀번호 (선택)</label>
              <input className="input" value={pw} onChange={e => setPw(e.target.value)} placeholder="없음" style={{ width: "100%", height: 36 }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: ".8125rem", fontWeight: 500, display: "block", marginBottom: 5 }}>만료</label>
              <select className="input" value={days} onChange={e => setDays(e.target.value)} style={{ width: "100%", height: 36 }}>
                <option value="">없음</option><option value="1">1일</option><option value="7">7일</option><option value="30">30일</option><option value="90">90일</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={onClose} className="btn btn-sm btn-ghost">취소</button>
              <button onClick={create} className="btn btn-sm btn-primary">링크 생성</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input className="input" value={url} readOnly style={{ flex: 1, fontSize: ".8125rem", background: "var(--color-canvas)" }} />
              <button onClick={copy} className="btn btn-sm btn-primary">{copied ? "✓" : "복사"}</button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { onUnshare(file.id); onClose(); }} className="btn btn-sm btn-ghost" style={{ color: "#dc2626" }}>공유 해제</button>
              <div style={{ flex: 1 }} /><button onClick={onClose} className="btn btn-sm btn-ghost">닫기</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── 컨텍스트 메뉴 ───────────────────────────────────────── */
function CtxMenu({ x, y, file, onClose, handlers }: {
  x: number; y: number; file: DriveFile; onClose: () => void;
  handlers: { rename(): void; share(): void; star(): void; trash(): void; restore(): void; deletePerm(): void; download(): void; };
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const Row = ({ label, icon, fn, danger }: { label: string; icon: string; fn(): void; danger?: boolean }) => (
    <button onClick={() => { fn(); onClose(); }}
      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "7px 14px", background: "none", border: "none", cursor: "pointer", fontSize: ".875rem", color: danger ? "#dc2626" : "var(--color-ink)", textAlign: "left" }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--color-canvas)")}
      onMouseLeave={e => (e.currentTarget.style.background = "none")}
    >{icon} {label}</button>
  );

  return (
    <div ref={ref} style={{ position: "fixed", left: x, top: y, background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.15)", zIndex: 600, minWidth: 170, padding: "4px 0" }}>
      {file.deleted_at ? (
        <>
          <Row label="복원" icon="↩" fn={handlers.restore} />
          <Row label="영구 삭제" icon="✕" fn={handlers.deletePerm} danger />
        </>
      ) : (
        <>
          <Row label="다운로드" icon="↓" fn={handlers.download} />
          <Row label="공유" icon="⬡" fn={handlers.share} />
          <Row label="이름 변경" icon="✎" fn={handlers.rename} />
          <Row label={file.is_starred ? "별표 해제" : "별표 추가"} icon="★" fn={handlers.star} />
          <div style={{ height: 1, background: "var(--color-hairline)", margin: "4px 0" }} />
          <Row label="휴지통으로 이동" icon="✕" fn={handlers.trash} danger />
        </>
      )}
    </div>
  );
}

/* ─── 메인 페이지 ─────────────────────────────────────────── */
export default function DrivePage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [storage, setStorage] = useState<StorageInfo>({ used: 0, max: 5 << 30, plan: "free" });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("my");
  const [layout, setLayout] = useState<Layout>("list");
  const [sort, setSort] = useState<SortKey>("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [parent, setParent] = useState<number | null>(null);
  const [crumbs, setCrumbs] = useState<{ id: number | null; name: string }[]>([{ id: null, name: "내 드라이브" }]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [newFolder, setNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameName, setRenameName] = useState("");
  const [shareFile, setShareFile] = useState<DriveFile | null>(null);
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; file: DriveFile } | null>(null);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (view === "my" && parent != null) p.set("parent", String(parent));
      if (view !== "my") p.set("view", view);
      if (search) p.set("search", search);
      p.set("sort", sort); p.set("order", order);
      const r = await fetch(`/api/v1/drive?${p}`);
      const d = await r.json();
      setFiles(d.files ?? []); setStorage(d.storage ?? { used: 0, max: 5 << 30, plan: "free" });
    } catch { setErr("불러오기 실패"); }
    setLoading(false);
  }, [view, parent, search, sort, order]);

  useEffect(() => { load(); }, [load]);

  function switchView(v: ViewMode) {
    setView(v); setSelected(new Set()); setSearch("");
    if (v === "my") { setCrumbs([{ id: null, name: "내 드라이브" }]); setParent(null); }
  }
  function openFolder(f: DriveFile) {
    if (view !== "my") { setView("my"); setCrumbs([{ id: null, name: "내 드라이브" }]); }
    setParent(f.id); setCrumbs(prev => [...prev, { id: f.id, name: f.name }]); setSelected(new Set());
  }
  function navCrumb(idx: number) {
    const c = crumbs[idx]; setCrumbs(prev => prev.slice(0, idx + 1));
    setParent(c.id); setSelected(new Set()); setSearch("");
  }

  async function upload(list: FileList) {
    setUploading(true); setErr(""); setUploadPct(0);
    const arr = Array.from(list);
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      const fd = new FormData(); fd.append("file", file);
      if (parent != null) fd.append("parent_id", String(parent));
      await new Promise<void>(res => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/v1/drive");
        xhr.upload.onprogress = e => { if (e.lengthComputable) setUploadPct(Math.round(((i + e.loaded / e.total) / arr.length) * 100)); };
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) {
            const d = JSON.parse(xhr.responseText);
            setFiles(prev => [d.file, ...prev]);
            setStorage(s => ({ ...s, used: s.used + file.size }));
          } else { try { setErr(JSON.parse(xhr.responseText).error ?? "업로드 실패"); } catch { setErr("업로드 실패"); } }
          res();
        };
        xhr.onerror = () => { setErr("업로드 오류"); res(); };
        xhr.send(fd);
      });
    }
    setUploading(false); setUploadPct(0);
  }

  async function makeFolder() {
    if (!newFolderName.trim()) return;
    const r = await fetch("/api/v1/drive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newFolderName.trim(), parent_id: parent }) });
    const d = await r.json();
    if (r.ok) { setFiles(prev => [d.file, ...prev]); setNewFolder(false); setNewFolderName(""); }
  }
  async function rename(id: number, name: string) {
    if (!name.trim()) return;
    await fetch(`/api/v1/drive/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
    setFiles(prev => prev.map(f => f.id === id ? { ...f, name: name.trim() } : f)); setRenameId(null);
  }
  async function star(id: number) {
    const f = files.find(x => x.id === id); if (!f) return;
    const next = !f.is_starred;
    setFiles(prev => prev.map(x => x.id === id ? { ...x, is_starred: next } : x));
    await fetch(`/api/v1/drive/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_starred: next }) });
    if (view === "starred") setFiles(prev => prev.filter(x => x.id !== id));
  }
  async function trash(ids: number[]) {
    if (ids.length === 1) await fetch(`/api/v1/drive/${ids[0]}`, { method: "DELETE" });
    else await fetch("/api/v1/drive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bulk_trash", ids }) });
    setFiles(prev => prev.filter(f => !ids.includes(f.id))); setSelected(new Set());
  }
  async function restore(id: number) {
    await fetch(`/api/v1/drive/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore" }) });
    setFiles(prev => prev.filter(f => f.id !== id));
  }
  async function deletePerm(id: number) {
    const f = files.find(x => x.id === id);
    await fetch(`/api/v1/drive/${id}?permanent=1`, { method: "DELETE" });
    setFiles(prev => prev.filter(x => x.id !== id));
    if (f?.size) setStorage(s => ({ ...s, used: Math.max(0, s.used - f.size) }));
  }
  async function emptyTrash() {
    if (!confirm("휴지통을 비우시겠습니까? 복구할 수 없습니다.")) return;
    await fetch("/api/v1/drive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "empty_trash" }) });
    setFiles([]); load();
  }
  function unshare(id: number) { fetch(`/api/v1/drive/${id}/share`, { method: "DELETE" }); setFiles(prev => prev.map(f => f.id === id ? { ...f, share_token: null, is_shared: false } : f)); }

  const pct = Math.min(100, (storage.used / storage.max) * 100);
  const views: { id: ViewMode; label: string }[] = [{ id: "my", label: "내 드라이브" }, { id: "recent", label: "최근" }, { id: "starred", label: "별표" }, { id: "trash", label: "휴지통" }];

  /* 아이콘 SVG 헬퍼 */
  const ic = (d: string, color = "currentColor", fill = "none") => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={2}><path d={d} /></svg>
  );

  return (
    <div style={{ display: "flex", height: "calc(100vh - 60px)", overflow: "hidden", background: "var(--color-bg)" }}>
      <style>{`
        .drv-nav { display:flex; flex-direction:column; width:200px; flex-shrink:0; border-right:1px solid var(--color-hairline); background:var(--color-surface); overflow:hidden; }
        .drv-nav-btn { display:flex; align-items:center; gap:8px; padding:8px 14px; border:none; background:none; cursor:pointer; font-size:.875rem; color:var(--color-muted); width:100%; text-align:left; border-radius:0; transition:background .1s,color .1s; }
        .drv-nav-btn:hover { background:var(--color-canvas); color:var(--color-ink); }
        .drv-nav-btn.active { background:var(--color-canvas); color:var(--color-ink); font-weight:600; }
        .drv-main { flex:1; display:flex; flex-direction:column; min-width:0; overflow:hidden; }
        .drv-toolbar { display:flex; align-items:center; gap:8px; padding:10px 16px; border-bottom:1px solid var(--color-hairline); flex-shrink:0; background:var(--color-surface); flex-wrap:nowrap; min-height:52px; }
        .drv-crumb { display:flex; align-items:center; gap:4px; padding:8px 16px 0; flex-shrink:0; }
        .drv-scroll { flex:1; overflow-y:auto; padding:12px 16px 16px; }
        .drv-row { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; cursor:pointer; transition:background .1s; user-select:none; }
        .drv-row:hover { background:var(--color-canvas); }
        .drv-row.sel { background:#eff6ff; }
        .drv-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px; }
        .drv-card { padding:16px 10px 12px; border:1.5px solid var(--color-hairline); border-radius:12px; cursor:pointer; text-align:center; transition:box-shadow .15s,border-color .15s; background:var(--color-surface); }
        .drv-card:hover { box-shadow:0 4px 14px rgba(0,0,0,.08); border-color:var(--color-muted); }
        .drv-card.sel { border-color:#3b82f6; background:#eff6ff; }
        .drv-act { display:inline-flex; align-items:center; justify-content:center; padding:4px 7px; border:none; background:none; cursor:pointer; border-radius:5px; color:var(--color-muted); transition:background .1s,color .1s; text-decoration:none; }
        .drv-act:hover { background:var(--color-hairline); color:var(--color-ink); }
        .drv-act.danger:hover { color:#dc2626; }
        .drv-storage { padding:12px 14px; border-top:1px solid var(--color-hairline); flex-shrink:0; }
        /* 파일 행: 평소엔 크기 표시, 호버 시 액션 버튼 표시 */
        .drv-row .drv-size { display:flex; align-items:center; }
        .drv-row .drv-actions { display:none; align-items:center; gap:1px; }
        .drv-row:hover .drv-size { display:none; }
        .drv-row:hover .drv-actions { display:flex; }
        .drv-row.sel .drv-size { display:none; }
        .drv-row.sel .drv-actions { display:flex; }
        /* 모바일 뷰 탭 (인라인, 고정 아님) */
        .drv-view-tabs { display:none; overflow-x:auto; scrollbar-width:none; border-bottom:1px solid var(--color-hairline); background:var(--color-surface); flex-shrink:0; }
        .drv-view-tabs::-webkit-scrollbar { display:none; }
        .drv-view-tab { flex-shrink:0; display:inline-flex; align-items:center; gap:6px; padding:9px 14px; border:none; background:none; cursor:pointer; font-size:.8125rem; color:var(--color-muted); white-space:nowrap; border-bottom:2px solid transparent; transition:color .15s,border-color .15s; }
        .drv-view-tab.active { color:#3b82f6; border-bottom-color:#3b82f6; font-weight:600; }
        /* FAB — 위치는 대시보드 하단 탭바(~56px) 위 */
        .drv-fab { display:none; position:fixed; bottom:70px; right:18px; width:52px; height:52px; border-radius:50%; background:#3b82f6; color:#fff; border:none; cursor:pointer; box-shadow:0 4px 16px rgba(59,130,246,.5); font-size:1.5rem; align-items:center; justify-content:center; z-index:101; transition:transform .15s,box-shadow .15s; }
        .drv-fab:hover { transform:scale(1.05); box-shadow:0 6px 20px rgba(59,130,246,.6); }
        .drv-fab:active { transform:scale(.96); }
        @media(max-width:768px){
          /* 대시보드 하단 탭바가 보이는 breakpoint와 맞춤 */
          .drv-scroll { padding-bottom:70px; }
        }
        @media(max-width:640px){
          .drv-nav { display:none; }
          .drv-view-tabs { display:flex; }
          .drv-fab { display:flex; }
          /* 모바일에서 항상 액션 표시 */
          .drv-row .drv-size { display:none !important; }
          .drv-row .drv-actions { display:flex !important; }
          .drv-toolbar { padding:8px 10px; gap:6px; min-height:46px; }
          .drv-row { padding:10px 8px; gap:8px; min-height:48px; }
          .drv-card { padding:14px 8px 10px; }
          .hide-mobile { display:none; }
          /* 모바일 액션 버튼 터치 영역 확대 */
          .drv-act { padding:6px 8px; }
        }
      `}</style>

      {/* ── 사이드바 ── */}
      <div className="drv-nav">
        {/* 상단 버튼 */}
        <div style={{ padding: "12px 10px 8px" }}>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="btn btn-primary" style={{ width: "100%", justifyContent: "center", gap: 6, fontSize: ".875rem", height: 36 }}>
            {ic("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12", "#fff")}
            {uploading ? `${uploadPct}%` : "업로드"}
          </button>
          <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => { if (e.target.files?.length) upload(e.target.files); e.target.value = ""; }} />
        </div>

        {/* 네비게이션 */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {views.map(v => (
            <button key={v.id} className={`drv-nav-btn${view === v.id ? " active" : ""}`} onClick={() => switchView(v.id)}>
              {v.id === "my" && <svg width="15" height="15" viewBox="0 0 24 24" fill={view === "my" ? "#3b82f6" : "none"} stroke={view === "my" ? "#3b82f6" : "currentColor"} strokeWidth={1.8}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>}
              {v.id === "recent" && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
              {v.id === "starred" && <svg width="15" height="15" viewBox="0 0 24 24" fill={view === "starred" ? "#f59e0b" : "none"} stroke={view === "starred" ? "#f59e0b" : "currentColor"} strokeWidth={1.8}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
              {v.id === "trash" && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>}
              {v.label}
            </button>
          ))}
        </div>

        {/* 저장공간 — 사이드바 하단 고정 */}
        <div className="drv-storage">
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".75rem", color: "var(--color-muted)", marginBottom: 5 }}>
            <span>저장공간</span><span style={{ textTransform: "uppercase", fontWeight: 600 }}>{storage.plan}</span>
          </div>
          <div style={{ height: 4, background: "var(--color-hairline)", borderRadius: 2, marginBottom: 5, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 2, background: pct > 90 ? "#dc2626" : pct > 70 ? "#f59e0b" : "#3b82f6", transition: "width .4s" }} />
          </div>
          <div style={{ fontSize: ".72rem", color: "var(--color-muted)" }}>{formatBytes(storage.used)} / {formatBytes(storage.max)}</div>
          <a href={BMC_URL} target="_blank" rel="noreferrer"
            style={{ display: "block", marginTop: 8, padding: "5px 8px", borderRadius: 7, background: "#FFDD00", color: "#1a1714", fontSize: ".72rem", fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
            ☕ 저장공간 추가
          </a>
        </div>
      </div>

      {/* ── 메인 영역 ── */}
      <div className="drv-main"
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) upload(e.dataTransfer.files); }}>

        {dragOver && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(59,130,246,.1)", border: "2px dashed #3b82f6", borderRadius: 10, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "#3b82f6" }}>파일을 여기에 놓으세요</span>
          </div>
        )}

        {/* ── 모바일 뷰 탭 (인라인, 대시보드 하단바와 충돌 없음) ── */}
        <div className="drv-view-tabs">
          {views.map(v => (
            <button key={v.id} className={`drv-view-tab${view === v.id ? " active" : ""}`} onClick={() => switchView(v.id)}>
              {v.id === "my" && <svg width="14" height="14" viewBox="0 0 24 24" fill={view==="my"?"#3b82f6":"none"} stroke={view==="my"?"#3b82f6":"currentColor"} strokeWidth={1.8}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>}
              {v.id === "recent" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
              {v.id === "starred" && <svg width="14" height="14" viewBox="0 0 24 24" fill={view==="starred"?"#f59e0b":"none"} stroke={view==="starred"?"#f59e0b":"currentColor"} strokeWidth={1.8}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
              {v.id === "trash" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>}
              {v.label}
            </button>
          ))}
        </div>

        {/* ── 툴바 (1줄) ── */}
        <div className="drv-toolbar">
          {/* 새 폴더 */}
          {view === "my" && (
            <button onClick={() => { setNewFolder(true); setNewFolderName(""); }} className="btn btn-ghost btn-sm" style={{ flexShrink: 0, gap: 4, whiteSpace: "nowrap" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2zM12 11v6M9 14h6"/></svg>
              <span className="hide-mobile">새 폴더</span>
            </button>
          )}
          {view === "trash" && files.length > 0 && (
            <button onClick={emptyTrash} className="btn btn-sm" style={{ flexShrink: 0, background: "#dc2626", color: "#fff", whiteSpace: "nowrap" }}>휴지통 비우기</button>
          )}
          {selected.size > 0 && view !== "trash" && (
            <button onClick={() => trash(Array.from(selected))} className="btn btn-sm btn-ghost" style={{ flexShrink: 0, color: "#dc2626", whiteSpace: "nowrap" }}>
              {selected.size}개 삭제
            </button>
          )}

          {/* 검색 — flex 확장 */}
          <input className="input" placeholder="검색..." value={search}
            onChange={e => { setSearch(e.target.value); clearTimeout(searchTimer.current); searchTimer.current = setTimeout(load, 350); }}
            style={{ flex: "1 1 0", minWidth: 80, maxWidth: 200, height: 32, fontSize: ".875rem" }} />

          {/* 정렬 */}
          <select className="input" value={`${sort}-${order}`}
            onChange={e => { const [s, o] = e.target.value.split("-"); setSort(s as SortKey); setOrder(o as "asc" | "desc"); }}
            style={{ height: 32, fontSize: ".8125rem", flexShrink: 0, paddingRight: 24, minWidth: 90 }}>
            <option value="name-asc">이름 ↑</option><option value="name-desc">이름 ↓</option>
            <option value="size-asc">크기 ↑</option><option value="size-desc">크기 ↓</option>
            <option value="updated_at-desc">수정일 ↓</option><option value="updated_at-asc">수정일 ↑</option>
            <option value="created_at-desc">생성일 ↓</option><option value="created_at-asc">생성일 ↑</option>
          </select>

          {/* 레이아웃 토글 */}
          <button onClick={() => setLayout(l => l === "list" ? "grid" : "list")} className="drv-act" title="보기 전환" style={{ flexShrink: 0 }}>
            {layout === "list"
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>}
          </button>
        </div>

        {/* ── 브레드크럼 (My Drive만) ── */}
        {view === "my" && crumbs.length > 1 && (
          <div className="drv-crumb">
            {crumbs.map((c, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {i > 0 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={2}><path d="M9 18l6-6-6-6"/></svg>}
                <button onClick={() => navCrumb(i)}
                  style={{ background: "none", border: "none", cursor: i < crumbs.length - 1 ? "pointer" : "default", padding: "2px 3px", borderRadius: 4, fontSize: ".8125rem", fontWeight: i === crumbs.length - 1 ? 600 : 400, color: i < crumbs.length - 1 ? "var(--color-muted)" : "var(--color-ink)" }}>
                  {c.name}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* ── 업로드 진행 ── */}
        {uploading && (
          <div style={{ padding: "6px 16px", borderBottom: "1px solid var(--color-hairline)", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".75rem", marginBottom: 3, color: "var(--color-muted)" }}>
              <span>업로드 중...</span><span>{uploadPct}%</span>
            </div>
            <div style={{ height: 3, background: "var(--color-hairline)", borderRadius: 2 }}>
              <div style={{ height: "100%", background: "#3b82f6", borderRadius: 2, width: `${uploadPct}%`, transition: "width .2s" }} />
            </div>
          </div>
        )}

        {/* ── 오류 메시지 ── */}
        {err && (
          <div style={{ padding: "6px 16px", background: "#fef2f2", borderBottom: "1px solid #fecaca", display: "flex", alignItems: "center", gap: 8, fontSize: ".875rem", color: "#991b1b", flexShrink: 0 }}>
            <span style={{ flex: 1 }}>{err}</span><button onClick={() => setErr("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b" }}>✕</button>
          </div>
        )}

        {/* ── 새 폴더 입력 ── */}
        {newFolder && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: "1px solid var(--color-hairline)", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#d97706" strokeWidth={1.5}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <input autoFocus className="input" placeholder="폴더 이름" value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") makeFolder(); if (e.key === "Escape") setNewFolder(false); }}
              style={{ flex: 1, height: 32 }} />
            <button onClick={makeFolder} className="btn btn-sm btn-primary">만들기</button>
            <button onClick={() => setNewFolder(false)} className="btn btn-sm btn-ghost">취소</button>
          </div>
        )}

        {/* ── 파일 목록 ── */}
        <div className="drv-scroll">
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "var(--color-muted)", fontSize: ".9rem" }}>불러오는 중...</div>
          ) : files.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "var(--color-muted)", fontSize: ".9rem" }}>
              {view === "trash" ? "휴지통이 비어 있습니다" : view === "starred" ? "별표 항목이 없습니다" : view === "recent" ? "최근 항목이 없습니다" : search ? "검색 결과 없음" : "파일을 드래그하거나 업로드하세요"}
            </div>
          ) : layout === "list" ? (
            /* ── 리스트 ── */
            <div style={{ background: "var(--color-surface)", borderRadius: 10, border: "1px solid var(--color-hairline)", overflow: "hidden" }}>
              {/* 헤더 */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: "var(--color-canvas)", borderBottom: "1px solid var(--color-hairline)" }}>
                <input type="checkbox" checked={selected.size === files.length && files.length > 0}
                  onChange={() => setSelected(s => s.size === files.length ? new Set() : new Set(files.map(f => f.id)))}
                  style={{ width: 14, height: 14, cursor: "pointer", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: ".72rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>이름</span>
                <span style={{ minWidth: 64, fontSize: ".72rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", textAlign: "right", flexShrink: 0 }}>크기</span>
              </div>
              {files.map(file => (
                <div key={file.id} style={{ borderBottom: "1px solid var(--color-hairline)" }} onContextMenu={e => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, file }); }}>
                  {renameId === file.id ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "7px 10px" }}>
                      <FileIcon file={file} />
                      <input autoFocus className="input" value={renameName} onChange={e => setRenameName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") rename(file.id, renameName); if (e.key === "Escape") setRenameId(null); }}
                        style={{ flex: 1, height: 30 }} />
                      <button onClick={() => rename(file.id, renameName)} className="btn btn-sm btn-primary">저장</button>
                      <button onClick={() => setRenameId(null)} className="btn btn-sm btn-ghost">취소</button>
                    </div>
                  ) : (
                    <div className={`drv-row${selected.has(file.id) ? " sel" : ""}`}
                      onDoubleClick={() => file.type === "folder" && openFolder(file)}
                      onClick={e => { if ((e.target as HTMLElement).closest("button,a,input")) return; file.type === "folder" ? openFolder(file) : setSelected(s => { const n = new Set(s); n.has(file.id) ? n.delete(file.id) : n.add(file.id); return n; }); }}>
                      <input type="checkbox" checked={selected.has(file.id)} onChange={() => setSelected(s => { const n = new Set(s); n.has(file.id) ? n.delete(file.id) : n.add(file.id); return n; })}
                        onClick={e => e.stopPropagation()} style={{ width: 14, height: 14, cursor: "pointer", flexShrink: 0 }} />
                      <FileIcon file={file} />
                      <span onClick={e => { e.stopPropagation(); if (file.type === "file") setPreviewFile(file); }}
                        style={{ flex: 1, fontSize: ".875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: file.type === "file" ? "pointer" : "default" }}
                        title={file.type === "file" ? "클릭하여 미리보기" : undefined}>{file.name}</span>
                      {/* 크기 — 평소 표시, 호버 시 숨김 */}
                      <div className="drv-size" style={{ minWidth: 64, justifyContent: "flex-end", flexShrink: 0 }}>
                        {file.is_starred && <svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b" stroke="none" style={{ marginRight: 4 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                        {file.is_shared && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} style={{ marginRight: 4 }}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>}
                        <span style={{ fontSize: ".8125rem", color: "var(--color-muted)" }}>
                          {file.type === "file" ? formatBytes(file.size) : "폴더"}
                        </span>
                      </div>
                      {/* 액션 버튼 — 데스크톱:호버 / 모바일:항상 */}
                      <div className="drv-actions" style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        {view === "trash" ? (
                          <>
                            <button className="drv-act" title="복원" onClick={() => restore(file.id)} style={{ fontSize: ".75rem", padding: "4px 8px" }}>↩ 복원</button>
                            <button className="drv-act danger" title="영구삭제" onClick={() => deletePerm(file.id)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                            </button>
                          </>
                        ) : (
                          <>
                            {file.type === "file" && (
                              <button className="drv-act" title="열기" onClick={() => setPreviewFile(file)}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                              </button>
                            )}
                            <a className="drv-act" title="다운로드" href={`/api/v1/drive/${file.id}/download`}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                            </a>
                            <button className="drv-act" title="공유" onClick={() => setShareFile(file)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
                            </button>
                            <button className="drv-act" title={file.is_starred ? "별표 해제" : "별표"} onClick={() => star(file.id)} style={{ color: file.is_starred ? "#f59e0b" : undefined }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill={file.is_starred ? "#f59e0b" : "none"} stroke={file.is_starred ? "#f59e0b" : "currentColor"} strokeWidth={2}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            </button>
                            <button className="drv-act" title="이름 변경" onClick={() => { setRenameId(file.id); setRenameName(file.name); }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button className="drv-act danger" title="삭제" onClick={() => trash([file.id])}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
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
            /* ── 그리드 ── */
            <div className="drv-grid">
              {files.map(file => (
                <div key={file.id} className={`drv-card${selected.has(file.id) ? " sel" : ""}`}
                  onContextMenu={e => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, file }); }}
                  onDoubleClick={() => file.type === "folder" && openFolder(file)}
                  onClick={e => { if ((e.target as HTMLElement).closest("button,a")) return; file.type === "folder" ? openFolder(file) : setSelected(s => { const n = new Set(s); n.has(file.id) ? n.delete(file.id) : n.add(file.id); return n; }); }}>
                  <div style={{ position: "relative", width: "fit-content", margin: "0 auto 10px", display: "flex" }}>
                    <FileIcon file={file} size={34} />
                    {file.is_starred && <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b" stroke="none" style={{ position: "absolute", top: -3, right: -3 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                  </div>
                  <div style={{ fontSize: ".8125rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }} title={file.name}>{file.name}</div>
                  <div style={{ fontSize: ".72rem", color: "var(--color-muted)", marginBottom: 8 }}>{file.type === "file" ? formatBytes(file.size) : "폴더"}</div>
                  <div style={{ display: "flex", gap: 4, justifyContent: "center" }} onClick={e => e.stopPropagation()}>
                    {view === "trash" ? (
                      <>
                        <button className="drv-act" onClick={() => restore(file.id)} style={{ fontSize: ".72rem", padding: "3px 7px" }}>복원</button>
                        <button className="drv-act danger" onClick={() => deletePerm(file.id)} style={{ fontSize: ".72rem", padding: "3px 7px" }}>삭제</button>
                      </>
                    ) : (
                      <>
                        <a className="drv-act" href={`/api/v1/drive/${file.id}/download`} title="다운로드" style={{ fontSize: ".72rem", padding: "3px 7px" }}>↓</a>
                        <button className="drv-act" onClick={() => setShareFile(file)} style={{ fontSize: ".72rem", padding: "3px 7px" }}>공유</button>
                        <button className="drv-act danger" onClick={() => trash([file.id])} style={{ fontSize: ".72rem", padding: "3px 7px" }}>삭제</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 컨텍스트 메뉴 ── */}
      {ctx && (
        <CtxMenu x={ctx.x} y={ctx.y} file={ctx.file} onClose={() => setCtx(null)}
          handlers={{
            rename: () => { setRenameId(ctx.file.id); setRenameName(ctx.file.name); },
            share: () => setShareFile(ctx.file),
            star: () => star(ctx.file.id),
            trash: () => trash([ctx.file.id]),
            restore: () => restore(ctx.file.id),
            deletePerm: () => deletePerm(ctx.file.id),
            download: () => { window.location.href = `/api/v1/drive/${ctx.file.id}/download`; },
          }} />
      )}

      {/* ── 공유 모달 ── */}
      {shareFile && <ShareModal file={shareFile} onClose={() => setShareFile(null)} onUnshare={unshare} />}

      {/* ── 미리보기 모달 ── */}
      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}

      {/* ── 모바일 FAB 업로드 ── */}
      <button className="drv-fab" onClick={() => fileRef.current?.click()} title="업로드">
        {uploading
          ? <span style={{ fontSize: ".75rem", fontWeight: 700 }}>{uploadPct}%</span>
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>}
      </button>

    </div>
  );
}
