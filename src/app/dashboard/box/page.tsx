"use client";
import { useState, useEffect, useRef } from "react";
import { ShareButton } from "@/components/share-button";

interface BoxItem { id: string; original_name: string; file_size: number; mime_type: string; notes: string; archived_at: string | number; file_key: string; is_public?: boolean; share_token?: string | null; }

function fmtDate(ts: number | string | null | undefined): string {
  if (!ts) return "";
  return new Date(Number(ts)).toLocaleDateString("ko-KR");
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function getMimeIcon(mime: string) {
  const p = { width:18, height:18, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:1.5, strokeLinecap:"round" as const, strokeLinejoin:"round" as const };
  if (mime.startsWith("image/")) return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
  if (mime.startsWith("video/")) return <svg {...p}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;
  if (mime.startsWith("audio/")) return <svg {...p}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
  if (mime.includes("pdf") || mime.includes("word") || mime.includes("document") || mime.includes("sheet") || mime.includes("excel")) return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
  if (mime.includes("zip") || mime.includes("tar") || mime.includes("gz")) return <svg {...p}><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>;
  return <svg {...p}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
}

export default function BoxPage() {
  const [items, setItems] = useState<BoxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const [renaming, setRenaming] = useState<Record<string, string>>({});
  const [totalSize, setTotalSize] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/v1/box").then(r => r.json()).then(d => {
      if (d.items) {
        setItems(d.items);
        setTotalSize(d.items.reduce((s: number, i: BoxItem) => s + (i.file_size || 0), 0));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/v1/box/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (d.item) {
        setItems(prev => [d.item, ...prev]);
        setTotalSize(prev => prev + (d.item.file_size || 0));
      } else {
        alert(d.error ?? "업로드 실패");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function updateNotes(id: string) {
    const notes = editNotes[id] ?? "";
    const r = await fetch(`/api/v1/box/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    const d = await r.json();
    if (d.item) setItems(prev => prev.map(i => i.id === id ? d.item : i));
    setEditNotes(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  async function renameItem(id: string) {
    const name = renaming[id]?.trim();
    if (!name) { setRenaming(prev => { const n = { ...prev }; delete n[id]; return n; }); return; }
    const r = await fetch(`/api/v1/box/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ original_name: name }),
    });
    const d = await r.json();
    if (d.item) setItems(prev => prev.map(i => i.id === id ? d.item : i));
    setRenaming(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  async function deleteItem(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    const item = items.find(i => i.id === id);
    await fetch(`/api/v1/box/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
    if (item) setTotalSize(prev => prev - (item.file_size || 0));
  }

  async function copyLink(id: string) {
    const url = `${window.location.origin}/api/v1/box/${id}/download`;
    await navigator.clipboard.writeText(url).catch(() => {});
    alert("다운로드 링크가 복사되었습니다.");
  }

  return (
    <div style={{ padding: "clamp(16px, 4vw, 32px)", maxWidth: "900px" }}>
      <style>{`
        @media (max-width: 640px) {
          .box-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .box-upload-btn { width: 100% !important; }
          .box-actions { flex-wrap: wrap !important; }
          .box-actions a, .box-actions button { flex: 1 1 auto !important; justify-content: center !important; text-align: center !important; }
        }
      `}</style>
      <div className="box-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "4px" }}>KRL Box</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>
            디지털 보관함 · {items.length}개 파일 · {formatSize(totalSize)}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input ref={fileInput} type="file" style={{ display: "none" }} onChange={handleUpload} />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="box-upload-btn"
            style={{ padding: "8px 20px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.9375rem", fontWeight: 600 }}
          >
            {uploading ? "업로드 중..." : "파일 보관하기"}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--color-muted)" }}>로딩 중...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 32px", color: "var(--color-muted)", border: "2px dashed var(--color-hairline)", borderRadius: "16px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📦</div>
          <p style={{ marginBottom: "4px", fontWeight: 600 }}>보관된 파일이 없습니다.</p>
          <p style={{ fontSize: "0.875rem" }}>파일을 업로드해서 보관하세요.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {items.map(item => (
            <div key={item.id} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "24px", flexShrink: 0 }}>{getMimeIcon(item.mime_type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {item.id in renaming ? (
                    <input
                      value={renaming[item.id] ?? item.original_name}
                      onChange={e => setRenaming(prev => ({ ...prev, [item.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") renameItem(item.id); if (e.key === "Escape") setRenaming(prev => { const n = { ...prev }; delete n[item.id]; return n; }); }}
                      autoFocus
                      style={{ width: "100%", padding: "2px 6px", border: "1px solid var(--color-accent)", borderRadius: "4px", fontSize: "0.9375rem", fontWeight: 600, background: "var(--color-surface)", color: "var(--color-ink)" }}
                    />
                  ) : (
                    <p
                      style={{ fontWeight: 600, color: "var(--color-ink)", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
                      onDoubleClick={() => setRenaming(prev => ({ ...prev, [item.id]: item.original_name }))}
                      title="더블클릭으로 이름 변경"
                    >
                      {item.original_name}
                    </p>
                  )}
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                    {formatSize(item.file_size)} · {fmtDate(item.archived_at)}
                  </p>
                </div>
                {/* Action buttons */}
                <div className="box-actions" style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                  <a
                    href={`/api/v1/box/${item.id}/download`}
                    download={item.original_name}
                    style={{ padding: "5px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", background: "var(--color-accent)", color: "white", textDecoration: "none", fontSize: "0.8125rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}
                    title="다운로드"
                  >
                    ↓ 다운로드
                  </a>
                  <button
                    onClick={() => setRenaming(prev => ({ ...prev, [item.id]: item.original_name }))}
                    style={{ padding: "5px 8px", border: "1px solid var(--color-hairline)", borderRadius: "6px", background: "transparent", cursor: "pointer", fontSize: "0.8125rem", color: "var(--color-muted)" }}
                    title="이름 변경"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => deleteItem(item.id)} style={{ padding: "5px 8px", border: "1px solid var(--color-hairline)", borderRadius: "6px", background: "transparent", cursor: "pointer", color: "#ef4444", fontSize: "0.875rem" }} title="삭제">✕</button>
                </div>
              </div>
              {/* Share + Notes */}
              <div style={{ marginTop: "8px" }} onClick={e => e.stopPropagation()}>
                <ShareButton type="box" id={Number(item.id)} initialPublic={item.is_public} initialToken={item.share_token} />
              </div>
              <div style={{ marginTop: "10px", display: "flex", gap: "6px" }}>
                <input
                  value={editNotes[item.id] ?? item.notes ?? ""}
                  onChange={e => setEditNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                  placeholder="메모 추가... (Enter로 저장)"
                  onKeyDown={e => e.key === "Enter" && updateNotes(item.id)}
                  style={{ flex: 1, padding: "4px 8px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.8125rem", background: "var(--color-surface)", color: "var(--color-ink)" }}
                />
                {item.id in editNotes && (
                  <button onClick={() => updateNotes(item.id)} style={{ padding: "4px 10px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.8125rem" }}>저장</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
