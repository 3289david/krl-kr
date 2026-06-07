"use client";
import { useState, useEffect, useCallback, useRef } from "react";

interface Asset {
  id: string;
  code: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  project: string;
  title: string;
  views: number;
  bandwidth: number;
  active: boolean;
  created_at: string;
}

interface Stats { storage: string; views: string; bandwidth: string; }

function fmt(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function cdnUrl(code: string, filename: string) {
  return `https://cdn.krl.kr/u/${code}/${filename}`;
}

function copyText(t: string) { try { navigator.clipboard.writeText(t); } catch {} }

function Badge({ active }: { active: boolean }) {
  return (
    <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "99px", background: active ? "#DCFCE7" : "#FEE2E2", color: active ? "#166534" : "#991B1B" }}>
      {active ? "활성" : "비활성"}
    </span>
  );
}

function MimeIcon({ mime }: { mime: string }) {
  const icon = mime.startsWith("image/") ? "🖼️" : mime.startsWith("video/") ? "🎬" : mime.startsWith("audio/") ? "🎵" : mime.includes("pdf") ? "📄" : mime.includes("zip") || mime.includes("tar") || mime.includes("gzip") ? "📦" : "📁";
  return <span style={{ fontSize: "1.1rem" }}>{icon}</span>;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>({ storage: "0", views: "0", bandwidth: "0" });
  const [activeProject, setActiveProject] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (proj = activeProject) => {
    try {
      const url = proj ? `/api/v1/assets?project=${encodeURIComponent(proj)}` : "/api/v1/assets";
      const r = await fetch(url);
      if (r.ok) {
        const d = await r.json();
        setAssets(Array.isArray(d.assets) ? d.assets : []);
        setProjects(Array.isArray(d.projects) ? d.projects : []);
        if (d.stats) setStats(d.stats);
      }
    } catch {}
  }, [activeProject]);

  useEffect(() => { load(); }, [load]);

  async function upload(file: File) {
    if (uploading) return;
    setErr("");
    setUploading(true);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title || file.name);
      fd.append("project", project);

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", e => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)); });
      await new Promise<void>((resolve, reject) => {
        xhr.open("POST", "/api/v1/assets");
        xhr.onload = () => {
          if (xhr.status === 201) {
            const d = JSON.parse(xhr.responseText);
            setAssets(prev => [d.asset, ...prev]);
            setTitle("");
          } else {
            try { setErr(JSON.parse(xhr.responseText).error || "업로드 실패"); } catch { setErr("업로드 실패"); }
          }
          resolve();
        };
        xhr.onerror = () => { setErr("네트워크 오류"); reject(); };
        xhr.send(fd);
      });
    } catch { setErr("업로드 실패"); }
    setUploading(false);
    setProgress(0);
    load();
  }

  async function del(id: string) {
    if (!confirm("파일을 삭제하시겠습니까?")) return;
    await fetch(`/api/v1/assets/${id}`, { method: "DELETE" });
    setAssets(prev => prev.filter(a => a.id !== id));
  }

  function copy(url: string) {
    copyText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1800);
  }

  const statCards = [
    { label: "저장 용량", value: fmt(Number(stats.storage)), color: "#3B82F6" },
    { label: "총 조회수", value: Number(stats.views).toLocaleString(), color: "#10B981" },
    { label: "총 트래픽", value: fmt(Number(stats.bandwidth)), color: "#8B5CF6" },
  ];

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "4px" }}>KRL Assets</h1>
        <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>파일을 업로드하면 즉시 CDN URL이 생성됩니다. <code style={{ fontSize: "0.8rem" }}>cdn.krl.kr/u/{"{code}"}/{"{filename}"}</code></p>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        {statCards.map(s => (
          <div key={s.label} style={{ flex: "1 1 160px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginBottom: "4px" }}>{s.label}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "var(--color-accent)" : "var(--color-hairline)"}`,
          borderRadius: "12px", padding: "32px", textAlign: "center", cursor: "pointer",
          background: dragging ? "rgba(59,130,246,0.04)" : "var(--color-lifted)",
          transition: "all 0.15s", marginBottom: "16px",
        }}>
        <input ref={fileRef} type="file" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        {uploading ? (
          <div>
            <div style={{ marginBottom: "8px", fontSize: "0.875rem", color: "var(--color-muted)" }}>업로드 중... {progress}%</div>
            <div style={{ height: "6px", background: "var(--color-hairline)", borderRadius: "3px" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "var(--color-accent)", borderRadius: "3px", transition: "width 0.2s" }} />
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>☁️</div>
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>파일을 드래그하거나 클릭하여 업로드</div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>최대 200MB · 모든 파일 형식 지원</div>
          </>
        )}
      </div>

      {/* Options */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="제목 (선택)"
          style={{ flex: "1 1 200px", padding: "7px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
        <input value={project} onChange={e => setProject(e.target.value)} placeholder="프로젝트 슬러그 (선택, 예: myapp)"
          style={{ flex: "1 1 200px", padding: "7px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
      </div>

      {err && <div style={{ padding: "10px 14px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "8px", marginBottom: "16px", color: "#9B1C1C", fontSize: "0.875rem" }}>{err}</div>}

      {/* Project filter */}
      {projects.length > 0 && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
          <button onClick={() => { setActiveProject(""); load(""); }}
            style={{ padding: "4px 12px", borderRadius: "99px", border: "1px solid var(--color-hairline)", background: activeProject === "" ? "var(--color-accent)" : "transparent", color: activeProject === "" ? "white" : "var(--color-body)", fontSize: "0.8rem", cursor: "pointer" }}>
            전체
          </button>
          {projects.map(p => (
            <button key={p} onClick={() => { setActiveProject(p); load(p); }}
              style={{ padding: "4px 12px", borderRadius: "99px", border: "1px solid var(--color-hairline)", background: activeProject === p ? "var(--color-accent)" : "transparent", color: activeProject === p ? "white" : "var(--color-body)", fontSize: "0.8rem", cursor: "pointer" }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Asset list */}
      {assets.length === 0 ? (
        <p style={{ color: "var(--color-muted)", textAlign: "center", padding: "48px", fontSize: "0.9rem" }}>업로드한 파일이 없습니다.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {assets.map(a => {
            const url = cdnUrl(a.code, a.filename);
            return (
              <div key={a.id} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "10px", padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <MimeIcon mime={a.mime_type} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title || a.original_name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{a.original_name} · {fmt(Number(a.size))} · {Number(a.views).toLocaleString()} 조회</div>
                  </div>
                  <Badge active={a.active} />
                  {a.project && <span style={{ fontSize: "0.75rem", padding: "2px 8px", background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: "99px", color: "var(--color-muted)" }}>{a.project}</span>}
                  <button onClick={() => copy(url)}
                    style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid var(--color-hairline)", background: "transparent", fontSize: "0.78rem", cursor: "pointer", color: copied === url ? "#16A34A" : "var(--color-body)", whiteSpace: "nowrap" }}>
                    {copied === url ? "✓ 복사됨" : "URL 복사"}
                  </button>
                  <a href={url} target="_blank" rel="noopener"
                    style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid var(--color-hairline)", background: "transparent", fontSize: "0.78rem", textDecoration: "none", color: "var(--color-body)", whiteSpace: "nowrap" }}>
                    열기
                  </a>
                  <button onClick={() => del(a.id)}
                    style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #FECDD3", background: "transparent", fontSize: "0.78rem", cursor: "pointer", color: "#DC2626", whiteSpace: "nowrap" }}>
                    삭제
                  </button>
                </div>
                <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <code style={{ flex: 1, fontSize: "0.75rem", color: "var(--color-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
                    onClick={() => copy(url)} title="클릭하여 복사">
                    {url}
                  </code>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
