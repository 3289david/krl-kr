"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

interface Repo { id: string; name: string; description: string; is_public: boolean; }
interface GitFile { id: string; path: string; content: string; updated_at: number; }
interface Commit { id: string; message: string; files_changed: number; created_at: number; }

function fmtDate(ts: number | string | null | undefined): string {
  if (!ts) return "";
  return new Date(Number(ts)).toLocaleString("ko-KR");
}

function getFileColor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const colors: Record<string, string> = { ts: "#3178c6", tsx: "#3178c6", js: "#f7df1e", jsx: "#61dafb", css: "#1572b6", html: "#e34c26", json: "#a0a0a0", md: "#6366f1", py: "#3776ab", sh: "#4eaa25" };
  return colors[ext] ?? "#a0a0a0";
}

// Build a simple tree from flat file list
function buildTree(files: GitFile[]): Map<string, GitFile[]> {
  const tree = new Map<string, GitFile[]>();
  tree.set("", []);
  for (const f of files) {
    const parts = f.path.split("/");
    if (parts.length === 1) {
      tree.get("")!.push(f);
    } else {
      const dir = parts.slice(0, -1).join("/");
      if (!tree.has(dir)) tree.set(dir, []);
      tree.get(dir)!.push(f);
    }
  }
  return tree;
}

export default function GitRepoPage() {
  const params = useParams();
  const id = params.id as string;
  const [repo, setRepo] = useState<Repo | null>(null);
  const [files, setFiles] = useState<GitFile[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedFile, setSelectedFile] = useState<GitFile | null>(null);
  const [editContent, setEditContent] = useState("");
  const [tab, setTab] = useState<"files" | "commits">("files");
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/git/${id}`).then(r => r.json()).then(d => { if (d.repo) setRepo(d.repo); });
    fetch(`/api/v1/git/${id}/files`).then(r => r.json()).then(d => { if (d.files) setFiles(d.files); });
  }, [id]);

  function selectFile(file: GitFile) {
    setSelectedFile(file);
    setEditContent(file.content);
  }

  async function saveFile() {
    if (!selectedFile) return;
    setSaving(true);
    const autoMsg = files.some(f => f.path === selectedFile.path && f.content !== "") ? `Update ${selectedFile.path}` : `Add ${selectedFile.path}`;
    await fetch(`/api/v1/git/${id}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: selectedFile.path, content: editContent, commit_message: autoMsg }),
    });
    setFiles(prev => prev.map(f => f.path === selectedFile.path ? { ...f, content: editContent } : f));
    setSaving(false);
  }

  async function createNewFile() {
    if (!newFilePath.trim()) return;
    const r = await fetch(`/api/v1/git/${id}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: newFilePath, content: "", commit_message: `Add ${newFilePath}` }),
    });
    const d = await r.json();
    if (d.file) {
      setFiles(prev => [...prev, d.file]);
      setSelectedFile(d.file);
      setEditContent("");
      setNewFilePath("");
      setShowNewFile(false);
    }
  }

  async function createFolder() {
    const folderPath = prompt("폴더 경로 (예: src/components)");
    if (!folderPath) return;
    const keepPath = folderPath.replace(/\/$/, "") + "/.gitkeep";
    const r = await fetch(`/api/v1/git/${id}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: keepPath, content: "", commit_message: `Create folder ${folderPath}` }),
    });
    const d = await r.json();
    if (d.file) setFiles(prev => [...prev, d.file]);
  }

  async function deleteFile(file: GitFile, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`'${file.path}'을 삭제하시겠습니까?`)) return;
    await fetch(`/api/v1/git/${id}/files`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: file.path }),
    });
    setFiles(prev => prev.filter(f => f.path !== file.path));
    if (selectedFile?.path === file.path) { setSelectedFile(null); setEditContent(""); }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const isText = file.type.startsWith("text/") || /\.(ts|tsx|js|jsx|json|md|css|html|sh|py|txt|yaml|yml|toml|env)$/.test(file.name);
      let content: string;
      if (isText) {
        content = await file.text();
      } else {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        content = "binary:base64," + btoa(binary);
      }
      const r = await fetch(`/api/v1/git/${id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: file.name, content, commit_message: `Upload ${file.name}` }),
      });
      const d = await r.json();
      if (d.file) { setFiles(prev => [...prev, d.file]); selectFile(d.file); }
    } finally {
      setUploading(false);
      if (fileUploadRef.current) fileUploadRef.current.value = "";
    }
  }

  function toggleDir(dir: string) {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir); else next.add(dir);
      return next;
    });
  }

  // Render file tree
  function renderTree() {
    const tree = buildTree(files);
    const dirs = Array.from(tree.keys()).filter(k => k !== "").sort();
    const rootFiles = tree.get("") ?? [];

    return (
      <>
        {rootFiles.map(f => (
          <div key={f.path} onClick={() => selectFile(f)} style={{ padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", background: selectedFile?.path === f.path ? "var(--color-surface-card)" : "transparent", color: "var(--color-ink)" }}
            onMouseEnter={e => { if (selectedFile?.path !== f.path) (e.currentTarget as HTMLElement).style.background = "var(--color-surface)"; }}
            onMouseLeave={e => { if (selectedFile?.path !== f.path) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: getFileColor(f.path), flexShrink: 0 }} />
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.path.split("/").pop()}</span>
            <button onClick={e => deleteFile(f, e)} style={{ background: "none", border: "none", cursor: "pointer", color: "transparent", padding: "0 2px", fontSize: "0.7rem" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#ef4444"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "transparent"}
            >✕</button>
          </div>
        ))}
        {dirs.map(dir => {
          const dirFiles = tree.get(dir) ?? [];
          const isExpanded = expandedDirs.has(dir);
          const dirName = dir.split("/").pop();
          return (
            <div key={dir}>
              <div onClick={() => toggleDir(dir)} style={{ padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", color: "var(--color-ink)", userSelect: "none" }}>
                <span style={{ fontSize: "0.65rem", color: "var(--color-muted)" }}>{isExpanded ? "▼" : "▶"}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                <span style={{ fontWeight: 600 }}>{dirName}</span>
              </div>
              {isExpanded && dirFiles.map(f => (
                <div key={f.path} onClick={() => selectFile(f)} style={{ padding: "5px 12px 5px 28px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", background: selectedFile?.path === f.path ? "var(--color-surface-card)" : "transparent", color: "var(--color-ink)" }}
                  onMouseEnter={e => { if (selectedFile?.path !== f.path) (e.currentTarget as HTMLElement).style.background = "var(--color-surface)"; }}
                  onMouseLeave={e => { if (selectedFile?.path !== f.path) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: getFileColor(f.path), flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.path.split("/").pop()}</span>
                  <button onClick={e => deleteFile(f, e)} style={{ background: "none", border: "none", cursor: "pointer", color: "transparent", padding: "0 2px", fontSize: "0.7rem" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#ef4444"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "transparent"}
                  >✕</button>
                </div>
              ))}
            </div>
          );
        })}
      </>
    );
  }

  // Breadcrumb
  const breadcrumbs = selectedFile ? selectedFile.path.split("/") : [];

  return (
    <div className="git-outer" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 54px)" }}>
      <style>{`
        @media (max-width: 768px) {
          .git-outer { height: auto !important; min-height: calc(100vh - 54px); }
          .git-header { flex-wrap: wrap !important; padding: 10px 12px !important; gap: 8px !important; }
          .git-header-tabs { margin-left: 0 !important; }
          .git-body { flex-direction: column !important; overflow: visible !important; height: auto !important; flex: none !important; }
          .git-sidebar { width: 100% !important; height: auto !important; max-height: 220px; border-right: none !important; border-bottom: 1px solid var(--color-hairline); }
          .git-editor { min-height: 60vh; overflow: auto !important; }
          .git-editor textarea { min-height: 50vh; }
        }
      `}</style>
      {/* Repo header */}
      <div className="git-header" style={{ padding: "12px 24px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: "12px" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" style={{ color: "var(--color-muted)", flexShrink: 0 }}><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9V5.25M18 15v-2.25M6 9v6"/></svg>
        <span style={{ fontWeight: 700, fontSize: "1rem" }}>{repo?.name ?? "로딩 중..."}</span>
        {repo?.is_public && <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "99px", background: "#10b98120", color: "#10b981", fontWeight: 600 }}>공개</span>}
        <div className="git-header-tabs" style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
          {(["files", "commits"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "5px 12px", border: `1px solid ${tab === t ? "var(--color-accent)" : "var(--color-hairline)"}`, borderRadius: "6px", background: tab === t ? "var(--color-accent)" : "transparent", color: tab === t ? "white" : "var(--color-body)", cursor: "pointer", fontSize: "0.8125rem" }}>
              {t === "files" ? "파일" : "커밋"}
            </button>
          ))}
        </div>
      </div>

      <div className="git-body" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* File tree sidebar */}
        <div className="git-sidebar" style={{ width: "220px", borderRight: "1px solid var(--color-hairline)", overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-hairline)" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-muted)" }}>파일</span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button onClick={createFolder} title="새 폴더" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "2px", display: "flex", alignItems: "center" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></button>
              <button onClick={() => setShowNewFile(true)} title="새 파일" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "1.1rem", padding: "2px" }}>+</button>
              <input ref={fileUploadRef} type="file" style={{ display: "none" }} onChange={handleFileUpload} />
              <button onClick={() => fileUploadRef.current?.click()} disabled={uploading} title="파일 업로드" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "0.85rem", padding: "2px" }}>↑</button>
            </div>
          </div>
          {showNewFile && (
            <div style={{ padding: "6px 12px 8px", display: "flex", gap: "4px" }}>
              <input value={newFilePath} onChange={e => setNewFilePath(e.target.value)} onKeyDown={e => e.key === "Enter" && createNewFile()} placeholder="파일 경로" autoFocus style={{ flex: 1, padding: "3px 6px", border: "1px solid var(--color-hairline)", borderRadius: "4px", fontSize: "0.8rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
              <button onClick={createNewFile} style={{ padding: "3px 8px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem" }}>+</button>
              <button onClick={() => setShowNewFile(false)} style={{ padding: "3px 6px", border: "1px solid var(--color-hairline)", borderRadius: "4px", background: "transparent", cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
            </div>
          )}
          <div style={{ flex: 1, overflowY: "auto", paddingTop: "4px" }}>
            {renderTree()}
          </div>
        </div>

        {/* Editor / Commits */}
        <div className="git-editor" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {tab === "files" && selectedFile ? (
            <>
              <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--color-hairline)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface)" }}>
                {/* Breadcrumb */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8125rem", fontFamily: "var(--font-mono)", color: "var(--color-muted)" }}>
                  {breadcrumbs.map((part, i) => (
                    <span key={i}>
                      {i > 0 && <span style={{ margin: "0 2px" }}>/</span>}
                      <span style={{ color: i === breadcrumbs.length - 1 ? "var(--color-ink)" : "var(--color-muted)" }}>{part}</span>
                    </span>
                  ))}
                </div>
                <button onClick={saveFile} disabled={saving} style={{ padding: "5px 14px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}>
                  {saving ? "저장 중..." : "저장"}
                </button>
              </div>
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{ flex: 1, padding: "20px", border: "none", outline: "none", resize: "none", fontSize: "0.875rem", lineHeight: 1.6, background: "transparent", color: "var(--color-ink)", fontFamily: "var(--font-mono)" }} />
            </>
          ) : tab === "files" ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-muted)" }}>
              <div style={{ textAlign: "center" }}>
                <p>파일을 선택하세요.</p>
                <p style={{ fontSize: "0.8125rem", marginTop: "8px" }}>왼쪽에서 파일을 선택하거나 새 파일을 만드세요.</p>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
              {commits.length === 0 ? (
                <div style={{ color: "var(--color-muted)", textAlign: "center", padding: "40px" }}>커밋 내역이 없습니다. 파일을 저장하면 자동으로 커밋됩니다.</div>
              ) : commits.map(c => (
                <div key={c.id} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "8px", padding: "12px 16px", marginBottom: "8px" }}>
                  <p style={{ fontWeight: 600, marginBottom: "4px" }}>{c.message}</p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{c.files_changed}개 파일 · {fmtDate(c.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
