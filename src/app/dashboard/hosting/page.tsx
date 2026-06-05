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
  created_at: number;
}

interface SiteFile {
  path: string;
  size: number;
  modified: number;
}

const FRAMEWORKS = [
  { value: "static", label: "정적 HTML/CSS/JS" },
  { value: "react", label: "React (빌드 후 업로드)" },
  { value: "nextjs", label: "Next.js (next export 후 업로드)" },
  { value: "vue", label: "Vue.js (빌드 후 업로드)" },
  { value: "svelte", label: "Svelte/SvelteKit (빌드 후 업로드)" },
  { value: "astro", label: "Astro (빌드 후 업로드)" },
  { value: "vite", label: "Vite (빌드 후 업로드)" },
];

export default function HostingPage() {
  const [sites, setSites] = useState<HostingSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState("free");
  const [limits, setLimits] = useState({ sites: 1, storageMB: 500 });
  const [view, setView] = useState<"list" | "create" | "manage">("list");
  const [selectedSite, setSelectedSite] = useState<HostingSite | null>(null);
  const [siteFiles, setSiteFiles] = useState<SiteFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const zipRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    setDeploying(true); setError(""); setUploadProgress(0);
    const interval = setInterval(() => setUploadProgress(p => Math.min(p + 8, 85)), 300);
    try {
      const res = await fetch(`/api/v1/hosting/${siteId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: await file.arrayBuffer(),
      });
      clearInterval(interval);
      setUploadProgress(100);
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess("배포 완료!");
      if (selectedSite?.id === siteId) loadFiles(selectedSite);
      load();
    } catch { setError("업로드 오류"); }
    clearInterval(interval);
    setDeploying(false);
    setTimeout(() => setUploadProgress(0), 1500);
  }

  async function handleFileDeploy(siteId: number, file: File, filePath?: string) {
    setDeploying(true); setError("");
    const fd = new FormData();
    fd.append("file", file);
    if (filePath) fd.append("path", filePath);
    try {
      const res = await fetch(`/api/v1/hosting/${siteId}/deploy`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess("파일 업로드 완료!");
      if (selectedSite?.id === siteId) loadFiles(selectedSite);
      load();
    } catch { setError("업로드 오류"); }
    setDeploying(false);
  }

  async function handleFileDelete(siteId: number, filePath: string) {
    const res = await fetch(`/api/v1/hosting/${siteId}/deploy?path=${encodeURIComponent(filePath)}`, { method: "DELETE" });
    if (res.ok) {
      setSiteFiles(prev => prev.filter(f => f.path !== filePath));
      setSuccess("파일 삭제됨");
      load();
    }
  }

  async function handleDeleteSite(id: number) {
    const res = await fetch(`/api/v1/hosting/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSites(prev => prev.filter(s => s.id !== id));
      if (selectedSite?.id === id) { setView("list"); setSelectedSite(null); }
    }
    setDeleteConfirm(null);
  }

  function openManage(site: HostingSite) {
    setSelectedSite(site);
    setView("manage");
    loadFiles(site);
    setError(""); setSuccess("");
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "#16a34a", deploying: "#d97706", error: "#dc2626", suspended: "#6b7280"
    };
    const labels: Record<string, string> = { active: "운영중", deploying: "배포중", error: "오류", suspended: "정지" };
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: "5px",
        fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px",
        borderRadius: "9999px", background: `${colors[status] ?? "#6b7280"}22`,
        color: colors[status] ?? "#6b7280",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors[status] ?? "#6b7280" }} />
        {labels[status] ?? status}
      </span>
    );
  };

  if (loading) return (
    <div className="dashboard-page">
      <p style={{ color: "var(--color-muted)", padding: "48px 0", textAlign: "center" }}>불러오는 중...</p>
    </div>
  );

  return (
    <div className="dashboard-page">
      <style>{`
        .hosting-card { background: var(--color-surface); border: 1px solid var(--color-hairline); border-radius: 12px; padding: 20px; transition: box-shadow 0.15s; }
        .hosting-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .file-row:hover { background: var(--color-canvas); }
        .drop-zone { border: 2px dashed var(--color-hairline); border-radius: 12px; padding: 40px; text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
        .drop-zone:hover, .drop-zone.drag-over { border-color: var(--color-ink); background: var(--color-canvas); }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
        <div>
          {view !== "list" && (
            <button onClick={() => { setView("list"); setSelectedSite(null); setError(""); setSuccess(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "0.875rem", padding: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
              목록으로
            </button>
          )}
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
            {view === "list" ? "웹 호스팅" : view === "create" ? "새 사이트 만들기" : selectedSite?.name}
          </h1>
          {view === "list" && (
            <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", marginTop: 4 }}>
              HTML, React, Next.js, Vue 등 정적 사이트를 무료로 배포하세요.
            </p>
          )}
          {view === "manage" && selectedSite && (
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginTop: 4 }}>
              <a href={`https://${selectedSite.subdomain}.krl.kr`} target="_blank" rel="noreferrer"
                style={{ color: "var(--color-ink)", textDecoration: "underline" }}>
                {selectedSite.subdomain}.krl.kr
              </a>
              {" · "}
              {formatBytes(selectedSite.storage_used)} 사용중
            </p>
          )}
        </div>
        {view === "list" && (
          <button onClick={() => { setView("create"); setError(""); setSuccess(""); }}
            className="btn btn-primary" disabled={sites.length >= limits.sites}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>
            새 사이트
          </button>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {/* Plan bar */}
      {view === "list" && (
        <div style={{
          background: plan === "free" ? "var(--color-surface)" : "linear-gradient(135deg, #1a1714 0%, #2d2520 100%)",
          border: "1px solid var(--color-hairline)", borderRadius: 12, padding: "14px 20px",
          marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={plan === "free" ? "var(--color-ink)" : "#f4d03f"} strokeWidth={2}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span style={{ fontWeight: 600, color: plan !== "free" ? "#f4f0e6" : "var(--color-ink)", textTransform: "uppercase", fontSize: "0.8125rem", letterSpacing: "0.05em" }}>
              {plan === "free" ? "Free" : plan === "pro" ? "Pro" : "VIP"} 플랜
            </span>
            <span style={{ color: plan !== "free" ? "rgba(244,240,230,0.6)" : "var(--color-muted)", fontSize: "0.875rem" }}>
              · 사이트 {sites.length}/{limits.sites === 999 ? "무제한" : limits.sites}개 · 사이트당 {formatBytes(limits.storageMB * 1024 * 1024)}
            </span>
          </div>
          {plan === "free" && (
            <a href="/pricing" className="btn btn-sm" style={{ fontSize: "0.8125rem" }}>업그레이드</a>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {view === "list" && (
        <>
          {sites.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 32px", background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-hairline)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={1.5} style={{ margin: "0 auto 16px" }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" />
              </svg>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: 8 }}>아직 사이트가 없습니다</h3>
              <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem", marginBottom: 20 }}>HTML, React, Next.js 등 어떤 프레임워크도 배포 가능합니다.</p>
              <button onClick={() => setView("create")} className="btn btn-primary">첫 사이트 만들기</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {sites.map(site => (
                <div key={site.id} className="hosting-card">
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontWeight: 600, fontSize: "1rem", margin: "0 0 4px" }}>{site.name}</h3>
                      <a href={`https://${site.subdomain}.krl.kr`} target="_blank" rel="noreferrer"
                        style={{ fontSize: "0.8125rem", color: "var(--color-muted)", textDecoration: "none" }}>
                        {site.subdomain}.krl.kr ↗
                      </a>
                    </div>
                    {statusBadge(site.status)}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginBottom: 16 }}>
                    {FRAMEWORKS.find(f => f.value === site.framework)?.label ?? site.framework}
                    {" · "}
                    {formatBytes(site.storage_used)}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => openManage(site)} className="btn btn-sm btn-ghost" style={{ flex: 1 }}>관리</button>
                    <button onClick={() => setDeleteConfirm(site.id)} className="btn btn-sm btn-ghost"
                      style={{ color: "#dc2626", borderColor: "#dc262630" }}>삭제</button>
                  </div>
                  {deleteConfirm === site.id && (
                    <div style={{ marginTop: 12, padding: 12, background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
                      <p style={{ fontSize: "0.875rem", marginBottom: 10, color: "#991b1b" }}>정말 삭제하시겠습니까? 모든 파일이 삭제됩니다.</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleDeleteSite(site.id)} className="btn btn-sm" style={{ background: "#dc2626", color: "#fff" }}>삭제</button>
                        <button onClick={() => setDeleteConfirm(null)} className="btn btn-sm btn-ghost">취소</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Framework guide */}
          <div style={{ marginTop: 32, padding: 24, background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-hairline)" }}>
            <h3 style={{ fontWeight: 600, marginBottom: 16, fontSize: "0.9375rem" }}>배포 가이드</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {[
                { fw: "React", cmd: "npm run build → build/ 폴더를 ZIP으로 업로드", icon: "⚛" },
                { fw: "Next.js", cmd: "next build + next export → out/ 폴더를 ZIP으로 업로드", icon: "▲" },
                { fw: "Vue", cmd: "npm run build → dist/ 폴더를 ZIP으로 업로드", icon: "V" },
                { fw: "Svelte", cmd: "npm run build → public/ 폴더를 ZIP으로 업로드", icon: "S" },
                { fw: "Astro", cmd: "npm run build → dist/ 폴더를 ZIP으로 업로드", icon: "A" },
                { fw: "Vite", cmd: "npm run build → dist/ 폴더를 ZIP으로 업로드", icon: "⚡" },
              ].map(item => (
                <div key={item.fw} style={{ padding: "12px 14px", background: "var(--color-canvas)", borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, fontSize: "0.875rem" }}>{item.icon} {item.fw}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-muted)", lineHeight: 1.5 }}>{item.cmd}</div>
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
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <input className="input" value={form.subdomain}
                onChange={e => setForm(p => ({ ...p, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                placeholder="mysite" required style={{ borderRadius: "8px 0 0 8px", borderRight: "none" }} />
              <span style={{ padding: "0 12px", background: "var(--color-canvas)", border: "1px solid var(--color-hairline)", borderRadius: "0 8px 8px 0", height: 40, display: "flex", alignItems: "center", whiteSpace: "nowrap", color: "var(--color-muted)", fontSize: "0.875rem" }}>
                .krl.kr
              </span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">프레임워크</label>
            <select className="input" value={form.framework} onChange={e => setForm(p => ({ ...p, framework: e.target.value }))}>
              {FRAMEWORKS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="btn btn-primary">사이트 만들기</button>
            <button type="button" className="btn btn-ghost" onClick={() => setView("list")}>취소</button>
          </div>
        </form>
      )}

      {/* MANAGE VIEW */}
      {view === "manage" && selectedSite && (
        <div>
          {/* Quick actions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
            {/* ZIP deploy */}
            <div style={{ padding: 20, background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-hairline)" }}>
              <h4 style={{ fontWeight: 600, marginBottom: 8, fontSize: "0.9375rem" }}>ZIP 전체 배포</h4>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginBottom: 14 }}>빌드된 폴더를 ZIP으로 압축해 업로드하면 자동으로 배포됩니다.</p>
              {uploadProgress > 0 && (
                <div style={{ height: 4, background: "var(--color-hairline)", borderRadius: 2, marginBottom: 12 }}>
                  <div style={{ height: "100%", background: "var(--color-ink)", borderRadius: 2, width: `${uploadProgress}%`, transition: "width 0.3s" }} />
                </div>
              )}
              <input ref={zipRef} type="file" accept=".zip" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleZipDeploy(selectedSite.id, f); e.target.value = ""; }} />
              <button onClick={() => zipRef.current?.click()} className="btn btn-primary btn-sm" disabled={deploying}>
                {deploying ? "배포 중..." : "ZIP 파일 선택"}
              </button>
            </div>

            {/* Single file upload */}
            <div style={{ padding: 20, background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-hairline)" }}>
              <h4 style={{ fontWeight: 600, marginBottom: 8, fontSize: "0.9375rem" }}>파일 추가/수정</h4>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginBottom: 14 }}>개별 파일을 업로드합니다. 같은 이름이면 덮어씁니다.</p>
              <input ref={fileRef} type="file" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileDeploy(selectedSite.id, f); e.target.value = ""; }} />
              <button onClick={() => fileRef.current?.click()} className="btn btn-sm btn-ghost" disabled={deploying}>파일 선택</button>
            </div>
          </div>

          {/* File list */}
          <div style={{ background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-hairline)", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-hairline)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ fontWeight: 600, margin: 0, fontSize: "0.9375rem" }}>배포된 파일 ({siteFiles.length})</h4>
              <button onClick={() => loadFiles(selectedSite)} className="btn btn-sm btn-ghost">새로고침</button>
            </div>
            {filesLoading ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem" }}>로딩 중...</div>
            ) : siteFiles.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem" }}>
                아직 파일이 없습니다. ZIP을 업로드해서 사이트를 배포해 보세요.
              </div>
            ) : (
              <div>
                {siteFiles.map(file => (
                  <div key={file.path} className="file-row" style={{
                    display: "flex", alignItems: "center", padding: "10px 20px",
                    borderBottom: "1px solid var(--color-hairline)", gap: 12,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={2}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />
                    </svg>
                    <span style={{ flex: 1, fontSize: "0.875rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {file.path}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", whiteSpace: "nowrap" }}>{formatBytes(file.size)}</span>
                    <button onClick={() => handleFileDelete(selectedSite.id, file.path)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 4, lineHeight: 1 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
