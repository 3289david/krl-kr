"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { formatBytes } from "@/lib/utils";

interface HostingSite {
  id: number;
  name: string;
  subdomain: string;
  framework: string;
  status: string;
  storage_used: number;
  visit_count: number;
  created_at: number;
  updated_at: number;
}

interface SiteFile {
  path: string;
  size: number;
  modified: number;
}

const FRAMEWORKS = [
  { value: "static", label: "정적 HTML/CSS/JS" },
  { value: "react", label: "React (CRA / Vite)" },
  { value: "nextjs", label: "Next.js (static export)" },
  { value: "vue", label: "Vue.js" },
  { value: "svelte", label: "Svelte / SvelteKit" },
  { value: "astro", label: "Astro" },
  { value: "vite", label: "Vite" },
  { value: "angular", label: "Angular" },
];

const EDITABLE_EXTS = new Set(["html", "htm", "css", "js", "ts", "jsx", "tsx", "json", "xml", "txt", "md", "svg", "yaml", "yml"]);

function isEditable(filePath: string) {
  return EDITABLE_EXTS.has(filePath.split(".").pop()?.toLowerCase() ?? "");
}

function getFileIcon(filePath: string) {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  if (["html", "htm"].includes(ext)) return "#e34c26";
  if (ext === "css") return "#264de4";
  if (["js", "jsx", "ts", "tsx", "mjs"].includes(ext)) return "#f7df1e";
  if (ext === "json") return "#5d8a8a";
  if (ext === "svg") return "#ff9800";
  if (["png", "jpg", "jpeg", "gif", "webp", "avif"].includes(ext)) return "#4caf50";
  return "var(--color-muted)";
}

function getPathDepth(p: string) { return p.split("/").length; }
function getDir(p: string) { return p.split("/").slice(0, -1).join("/") || ""; }

export default function HostingPage() {
  const [sites, setSites] = useState<HostingSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState("free");
  const [limits, setLimits] = useState({ sites: 1, storageMB: 500 });
  const [view, setView] = useState<"list" | "create" | "manage">("list");
  const [selectedSite, setSelectedSite] = useState<HostingSite | null>(null);
  const [siteFiles, setSiteFiles] = useState<SiteFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [currentDir, setCurrentDir] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const zipRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Editor state
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);

  // New file/folder
  const [newFileMode, setNewFileMode] = useState<"file" | "folder" | null>(null);
  const [newFileName, setNewFileName] = useState("");

  const [form, setForm] = useState({ name: "", subdomain: "", framework: "static" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/hosting");
      const data = await res.json();
      setSites(data.sites ?? []);
      setPlan(data.plan ?? "free");
      setLimits(data.limits ?? { sites: 1, storageMB: 500 });
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function loadFiles(site: HostingSite) {
    setFilesLoading(true);
    try {
      const res = await fetch(`/api/v1/hosting/${site.id}/files`);
      const data = await res.json();
      setSiteFiles(data.files ?? []);
    } catch {}
    setFilesLoading(false);
  }

  // Files in current directory
  const displayedFiles = siteFiles.filter(f => {
    const dir = getDir(f.path);
    return dir === currentDir;
  });

  // Unique subdirectories in current dir
  const subDirs = Array.from(new Set(
    siteFiles
      .filter(f => {
        const parts = f.path.split("/");
        const fileDir = parts.slice(0, -1).join("/");
        if (currentDir === "") return parts.length > 1;
        return fileDir.startsWith(currentDir + "/") && fileDir !== currentDir;
      })
      .map(f => {
        const parts = f.path.split("/");
        if (currentDir === "") return parts[0];
        const rel = f.path.slice(currentDir.length + 1).split("/")[0];
        return rel;
      })
  )).filter(Boolean);

  const breadcrumbs = currentDir ? ["", ...currentDir.split("/")] : [""];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    const res = await fetch("/api/v1/hosting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setSuccess("사이트가 생성되었습니다!");
    setForm({ name: "", subdomain: "", framework: "static" });
    load();
    setTimeout(() => { setView("list"); setSuccess(""); }, 1500);
  }

  async function handleZipDeploy(siteId: number, file: File) {
    setDeploying(true); setError(""); setUploadProgress(5);
    const interval = setInterval(() => setUploadProgress(p => Math.min(p + 7, 88)), 400);
    try {
      const res = await fetch(`/api/v1/hosting/${siteId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: await file.arrayBuffer(),
      });
      clearInterval(interval); setUploadProgress(100);
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess("배포 완료! 사이트가 업데이트되었습니다.");
      if (selectedSite?.id === siteId) loadFiles(selectedSite);
      load();
    } catch { setError("업로드 중 오류가 발생했습니다."); }
    clearInterval(interval); setDeploying(false);
    setTimeout(() => setUploadProgress(0), 2000);
  }

  async function handleFileDeploy(siteId: number, files: FileList) {
    setDeploying(true); setError("");
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const targetPath = currentDir ? `${currentDir}/${file.name}` : file.name;
      fd.append("path", targetPath);
      try {
        const res = await fetch(`/api/v1/hosting/${siteId}/deploy`, { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) { setError(data.error); break; }
      } catch { setError("업로드 오류"); break; }
    }
    setSuccess("파일 업로드 완료!");
    if (selectedSite?.id === siteId) loadFiles(selectedSite);
    load();
    setDeploying(false);
  }

  async function handleFileDelete(siteId: number, filePath: string) {
    const res = await fetch(`/api/v1/hosting/${siteId}/deploy?path=${encodeURIComponent(filePath)}`, { method: "DELETE" });
    if (res.ok) {
      setSiteFiles(prev => prev.filter(f => f.path !== filePath));
      load();
    }
  }

  async function handleDeleteSite(id: number) {
    await fetch(`/api/v1/hosting/${id}`, { method: "DELETE" });
    setSites(prev => prev.filter(s => s.id !== id));
    if (selectedSite?.id === id) { setView("list"); setSelectedSite(null); }
    setDeleteConfirm(null);
  }

  async function openEditor(filePath: string) {
    if (!selectedSite) return;
    setEditorLoading(true);
    setEditingFile(filePath);
    try {
      const res = await fetch(`/api/v1/hosting/${selectedSite.id}/file?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (res.ok) setEditorContent(data.content ?? "");
      else { setError(data.error); setEditingFile(null); }
    } catch { setError("파일 로드 오류"); setEditingFile(null); }
    setEditorLoading(false);
  }

  async function saveEditor() {
    if (!selectedSite || !editingFile) return;
    setEditorSaving(true);
    const res = await fetch(`/api/v1/hosting/${selectedSite.id}/file`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: editingFile, content: editorContent }),
    });
    const data = await res.json();
    if (res.ok) { setSuccess("저장 완료!"); loadFiles(selectedSite); }
    else setError(data.error);
    setEditorSaving(false);
  }

  async function createNewFile() {
    if (!selectedSite || !newFileName.trim()) return;
    const filePath = currentDir ? `${currentDir}/${newFileName}` : newFileName;
    if (newFileMode === "folder") {
      // Create a placeholder .gitkeep inside the folder
      const placeholder = `${filePath}/.gitkeep`;
      const fd = new FormData();
      fd.append("file", new Blob([""]), ".gitkeep");
      fd.append("path", placeholder);
      await fetch(`/api/v1/hosting/${selectedSite.id}/deploy`, { method: "POST", body: fd });
      loadFiles(selectedSite);
    } else {
      // Create file by opening editor with empty content
      setEditorContent("");
      setEditingFile(filePath);
    }
    setNewFileMode(null); setNewFileName("");
  }

  function openManage(site: HostingSite) {
    setSelectedSite(site);
    setView("manage");
    setCurrentDir("");
    setEditingFile(null);
    loadFiles(site);
    setError(""); setSuccess("");
  }

  const statusColors: Record<string, string> = { active: "#16a34a", deploying: "#d97706", error: "#dc2626", suspended: "#6b7280" };
  const statusLabels: Record<string, string> = { active: "운영중", deploying: "배포중", error: "오류", suspended: "정지" };

  if (loading) return (
    <div className="dashboard-page">
      <p style={{ color: "var(--color-muted)", textAlign: "center", padding: 48 }}>불러오는 중...</p>
    </div>
  );

  return (
    <div className="dashboard-page">
      <style>{`
        .hosting-card { background: var(--color-surface); border: 1px solid var(--color-hairline); border-radius: 12px; padding: 20px; transition: box-shadow 0.15s; cursor: default; }
        .hosting-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .file-row { display: flex; align-items: center; gap: 10px; padding: 9px 16px; border-bottom: 1px solid var(--color-hairline); transition: background 0.1s; }
        .file-row:hover { background: var(--color-canvas); }
        .file-row:last-child { border-bottom: none; }
        .dir-row { display: flex; align-items: center; gap: 10px; padding: 9px 16px; border-bottom: 1px solid var(--color-hairline); cursor: pointer; transition: background 0.1s; }
        .dir-row:hover { background: #fef9c3; }
        .editor-area { font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace; font-size: 0.825rem; line-height: 1.6; resize: vertical; min-height: 400px; tab-size: 2; }
        .drop-zone-host { border: 2px dashed var(--color-hairline); border-radius: 10px; padding: 24px; text-align: center; cursor: pointer; transition: all 0.2s; }
        .drop-zone-host:hover, .drop-zone-host.dg { border-color: var(--color-ink); background: var(--color-canvas); }
        .stat-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem; color: var(--color-muted); }
      `}</style>

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <div>
          {view !== "list" && (
            <button onClick={() => {
              if (editingFile) { setEditingFile(null); return; }
              if (currentDir) { setCurrentDir(currentDir.split("/").slice(0, -1).join("/")); return; }
              setView("list"); setSelectedSite(null);
            }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "0.875rem", padding: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
              {editingFile ? "파일 목록" : currentDir ? "상위 폴더" : "목록으로"}
            </button>
          )}
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
            {view === "list" ? "웹 호스팅" : view === "create" ? "새 사이트" : editingFile ? `편집: ${editingFile.split("/").pop()}` : selectedSite?.name}
          </h1>
          {view === "manage" && selectedSite && !editingFile && (
            <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
              <a href={`https://${selectedSite.subdomain}.krl.kr`} target="_blank" rel="noreferrer"
                style={{ fontSize: "0.8125rem", color: "var(--color-muted)", textDecoration: "none" }}>
                {selectedSite.subdomain}.krl.kr ↗
              </a>
              <span className="stat-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                {(selectedSite.visit_count ?? 0).toLocaleString()} 방문
              </span>
              <span className="stat-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" /></svg>
                {formatBytes(selectedSite.storage_used)}
              </span>
            </div>
          )}
        </div>
        {view === "list" && (
          <button onClick={() => setView("create")} className="btn btn-primary" disabled={sites.length >= limits.sites && limits.sites !== 999}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>
            새 사이트
          </button>
        )}
        {view === "manage" && editingFile && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveEditor} className="btn btn-primary btn-sm" disabled={editorSaving}>
              {editorSaving ? "저장 중..." : "저장"}
            </button>
            <button onClick={() => setEditingFile(null)} className="btn btn-sm btn-ghost">닫기</button>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}<button onClick={() => setError("")} style={{ marginLeft: 10, background: "none", border: "none", cursor: "pointer" }}>✕</button></div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {/* PLAN BAR */}
      {view === "list" && (
        <div style={{ background: plan !== "free" ? "linear-gradient(135deg,#1a1714,#2d2520)" : "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 12, padding: "12px 20px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.05em", color: plan !== "free" ? "#f4d03f" : "var(--color-ink)" }}>
            {plan} 플랜
          </span>
          <span style={{ fontSize: "0.875rem", color: plan !== "free" ? "rgba(244,240,230,0.6)" : "var(--color-muted)" }}>
            사이트 {sites.length}/{limits.sites === 999 ? "무제한" : limits.sites} · 사이트당 {formatBytes(limits.storageMB * 1024 * 1024)}
          </span>
          {plan === "free" && <a href="/pricing" className="btn btn-sm">업그레이드</a>}
        </div>
      )}

      {/* LIST VIEW */}
      {view === "list" && (
        <>
          {sites.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 32px", background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-hairline)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={1.5} style={{ margin: "0 auto 16px" }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" /></svg>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: 8 }}>사이트가 없습니다</h3>
              <p style={{ color: "var(--color-muted)", marginBottom: 20, fontSize: "0.9375rem" }}>React, Next.js, Vue 등 어떤 프레임워크도 배포하세요.</p>
              <button onClick={() => setView("create")} className="btn btn-primary">첫 사이트 만들기</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 16 }}>
              {sites.map(site => (
                <div key={site.id} className="hosting-card">
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <h3 style={{ fontWeight: 600, fontSize: "0.9375rem", margin: "0 0 3px" }}>{site.name}</h3>
                      <a href={`https://${site.subdomain}.krl.kr`} target="_blank" rel="noreferrer"
                        style={{ fontSize: "0.8125rem", color: "var(--color-muted)", textDecoration: "none" }}>
                        {site.subdomain}.krl.kr ↗
                      </a>
                    </div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 9999, background: `${statusColors[site.status] ?? "#6b7280"}18`, color: statusColors[site.status] ?? "#6b7280" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusColors[site.status] ?? "#6b7280" }} />
                      {statusLabels[site.status] ?? site.status}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
                    <span className="stat-chip"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>{(site.visit_count ?? 0).toLocaleString()}</span>
                    <span className="stat-chip"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>{formatBytes(site.storage_used)}</span>
                    <span className="stat-chip">{FRAMEWORKS.find(f => f.value === site.framework)?.label?.split(" ")[0] ?? site.framework}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => openManage(site)} className="btn btn-sm btn-ghost" style={{ flex: 1 }}>관리</button>
                    <button onClick={() => setDeleteConfirm(site.id)} className="btn btn-sm btn-ghost" style={{ color: "#dc2626" }}>삭제</button>
                  </div>
                  {deleteConfirm === site.id && (
                    <div style={{ marginTop: 10, padding: 12, background: "#fef2f2", borderRadius: 8 }}>
                      <p style={{ fontSize: "0.8125rem", color: "#991b1b", marginBottom: 8 }}>모든 파일이 삭제됩니다.</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleDeleteSite(site.id)} className="btn btn-sm" style={{ background: "#dc2626", color: "#fff" }}>삭제 확인</button>
                        <button onClick={() => setDeleteConfirm(null)} className="btn btn-sm btn-ghost">취소</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Build guide */}
          <div style={{ marginTop: 28, padding: 20, background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-hairline)" }}>
            <h3 style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 12 }}>프레임워크별 배포 방법</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
              {[
                { fw: "React/Vite", cmd: "npm run build → dist/ 폴더 ZIP" },
                { fw: "Next.js", cmd: "next build → out/ 폴더 ZIP (static export 필요)" },
                { fw: "Vue", cmd: "npm run build → dist/ 폴더 ZIP" },
                { fw: "Svelte", cmd: "npm run build → build/ 폴더 ZIP" },
                { fw: "Astro", cmd: "npm run build → dist/ 폴더 ZIP" },
                { fw: "Angular", cmd: "ng build → dist/ 폴더 ZIP" },
              ].map(i => (
                <div key={i.fw} style={{ padding: "10px 12px", background: "var(--color-canvas)", borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.825rem", marginBottom: 3 }}>{i.fw}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-muted)", lineHeight: 1.5 }}>{i.cmd}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* CREATE VIEW */}
      {view === "create" && (
        <form onSubmit={handleCreate} style={{ maxWidth: 520 }}>
          <div className="form-group">
            <label className="form-label">사이트 이름</label>
            <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="내 포트폴리오" required />
          </div>
          <div className="form-group">
            <label className="form-label">서브도메인</label>
            <div style={{ display: "flex" }}>
              <input className="input" value={form.subdomain}
                onChange={e => setForm(p => ({ ...p, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                placeholder="mysite" required style={{ borderRadius: "8px 0 0 8px", borderRight: "none", flex: 1 }} />
              <span style={{ padding: "0 12px", background: "var(--color-canvas)", border: "1px solid var(--color-hairline)", borderRadius: "0 8px 8px 0", display: "flex", alignItems: "center", whiteSpace: "nowrap", color: "var(--color-muted)", fontSize: "0.875rem", height: 40 }}>.krl.kr</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">프레임워크</label>
            <select className="input" value={form.framework} onChange={e => setForm(p => ({ ...p, framework: e.target.value }))}>
              {FRAMEWORKS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="btn btn-primary">만들기</button>
            <button type="button" className="btn btn-ghost" onClick={() => setView("list")}>취소</button>
          </div>
        </form>
      )}

      {/* MANAGE VIEW */}
      {view === "manage" && selectedSite && (
        <div>
          {/* Inline file editor */}
          {editingFile && (
            <div>
              <div style={{ marginBottom: 12, padding: "8px 12px", background: "var(--color-canvas)", borderRadius: 8, fontSize: "0.8125rem", color: "var(--color-muted)", fontFamily: "monospace" }}>
                {editingFile}
              </div>
              {editorLoading ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--color-muted)" }}>로딩 중...</div>
              ) : (
                <textarea
                  className="input editor-area"
                  value={editorContent}
                  onChange={e => setEditorContent(e.target.value)}
                  style={{ width: "100%", minHeight: 500, fontFamily: "monospace", fontSize: "0.825rem", lineHeight: 1.6 }}
                  onKeyDown={e => {
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const s = e.currentTarget.selectionStart;
                      const end = e.currentTarget.selectionEnd;
                      setEditorContent(v => v.slice(0, s) + "  " + v.slice(end));
                      setTimeout(() => { e.currentTarget.selectionStart = e.currentTarget.selectionEnd = s + 2; }, 0);
                    }
                    if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveEditor(); }
                  }}
                  spellCheck={false}
                />
              )}
              <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: 8 }}>Ctrl+S 또는 위의 저장 버튼으로 저장 · Tab 키는 들여쓰기</p>
            </div>
          )}

          {/* File manager */}
          {!editingFile && (
            <>
              {/* Deploy actions */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div
                  className={`drop-zone-host${dragOver ? " dg" : ""}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault(); setDragOver(false);
                    const zip = Array.from(e.dataTransfer.files).find(f => f.name.endsWith(".zip"));
                    if (zip) handleZipDeploy(selectedSite.id, zip);
                    else if (e.dataTransfer.files.length) handleFileDeploy(selectedSite.id, e.dataTransfer.files);
                  }}
                  onClick={() => zipRef.current?.click()}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={1.5} style={{ margin: "0 auto 8px" }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" />
                  </svg>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", margin: 0 }}>ZIP 전체 배포</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", margin: "4px 0 0" }}>드래그 또는 클릭</p>
                  <input ref={zipRef} type="file" accept=".zip" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleZipDeploy(selectedSite.id, f); e.target.value = ""; }} />
                  {uploadProgress > 0 && (
                    <div style={{ marginTop: 10, height: 3, background: "var(--color-hairline)", borderRadius: 2 }}>
                      <div style={{ height: "100%", background: "var(--color-ink)", borderRadius: 2, width: `${uploadProgress}%`, transition: "width 0.3s" }} />
                    </div>
                  )}
                </div>

                <div style={{ padding: 18, background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 10 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: 6 }}>파일 추가</p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginBottom: 12 }}>
                    현재 위치: <code style={{ background: "var(--color-canvas)", padding: "1px 6px", borderRadius: 4, fontSize: "0.75rem" }}>/{currentDir || "(루트)"}</code>
                  </p>
                  <input ref={fileRef} type="file" multiple style={{ display: "none" }}
                    onChange={e => { if (e.target.files?.length) handleFileDeploy(selectedSite.id, e.target.files); e.target.value = ""; }} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => fileRef.current?.click()} className="btn btn-sm btn-ghost" disabled={deploying}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" /></svg>
                      파일 선택
                    </button>
                    <button onClick={() => { setNewFileMode("file"); setNewFileName(""); }} className="btn btn-sm btn-ghost">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M12 11v6 M9 14h6" /></svg>
                      새 파일
                    </button>
                    <button onClick={() => { setNewFileMode("folder"); setNewFileName(""); }} className="btn btn-sm btn-ghost">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z M12 11v6 M9 14h6" /></svg>
                      새 폴더
                    </button>
                  </div>
                </div>
              </div>

              {/* New file/folder input */}
              {newFileMode && (
                <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", padding: "10px 14px", background: "var(--color-canvas)", borderRadius: 8 }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{newFileMode === "folder" ? "새 폴더:" : "새 파일:"}</span>
                  <input autoFocus className="input" value={newFileName} onChange={e => setNewFileName(e.target.value)}
                    placeholder={newFileMode === "folder" ? "images" : "index.html"}
                    onKeyDown={e => { if (e.key === "Enter") createNewFile(); if (e.key === "Escape") setNewFileMode(null); }}
                    style={{ maxWidth: 220, height: 34, fontSize: "0.875rem" }} />
                  <button onClick={createNewFile} className="btn btn-sm btn-primary">{newFileMode === "folder" ? "만들기" : "편집 시작"}</button>
                  <button onClick={() => setNewFileMode(null)} className="btn btn-sm btn-ghost">취소</button>
                </div>
              )}

              {/* File tree */}
              <div style={{ background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-hairline)", overflow: "hidden" }}>
                {/* Breadcrumb */}
                <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                  {breadcrumbs.map((seg, i) => (
                    <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {i > 0 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={2}><path d="M9 18l6-6-6-6" /></svg>}
                      <button onClick={() => setCurrentDir(breadcrumbs.slice(1, i + 1).join("/"))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: i === breadcrumbs.length - 1 ? "var(--color-ink)" : "var(--color-muted)", fontWeight: i === breadcrumbs.length - 1 ? 600 : 400, fontSize: "0.8125rem", padding: 0 }}>
                        {seg === "" ? "루트" : seg}
                      </button>
                    </span>
                  ))}
                  <div style={{ flex: 1 }} />
                  <button onClick={() => loadFiles(selectedSite)} className="btn btn-sm btn-ghost" style={{ fontSize: "0.75rem", padding: "3px 10px" }}>새로고침</button>
                </div>

                {filesLoading ? (
                  <div style={{ padding: 32, textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem" }}>로딩 중...</div>
                ) : (
                  <>
                    {/* Subdirs */}
                    {subDirs.map(dir => (
                      <div key={dir} className="dir-row" onClick={() => setCurrentDir(currentDir ? `${currentDir}/${dir}` : dir)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#d97706" strokeWidth={1.5}>
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <span style={{ flex: 1, fontSize: "0.875rem", fontWeight: 500 }}>{dir}/</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={2}><path d="M9 18l6-6-6-6" /></svg>
                      </div>
                    ))}

                    {/* Files */}
                    {displayedFiles.length === 0 && subDirs.length === 0 ? (
                      <div style={{ padding: 32, textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem" }}>
                        이 폴더에 파일이 없습니다. ZIP을 배포하거나 파일을 업로드하세요.
                      </div>
                    ) : displayedFiles.map(file => {
                      const fname = file.path.split("/").pop() ?? file.path;
                      return (
                        <div key={file.path} className="file-row">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={getFileIcon(file.path)} strokeWidth={2}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />
                          </svg>
                          <span style={{ flex: 1, fontSize: "0.8125rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {fname}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", whiteSpace: "nowrap" }}>{formatBytes(file.size)}</span>
                          <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                            {isEditable(file.path) && (
                              <button onClick={() => openEditor(file.path)} className="btn btn-ghost" style={{ padding: "3px 8px", height: "auto", fontSize: "0.75rem" }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                편집
                              </button>
                            )}
                            <button onClick={() => handleFileDelete(selectedSite.id, file.path)}
                              className="btn btn-ghost" style={{ padding: "3px 8px", height: "auto", color: "#dc2626" }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
