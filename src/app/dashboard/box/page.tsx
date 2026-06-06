"use client";
import { useState, useEffect, useRef } from "react";

interface BoxItem { id: string; original_name: string; file_size: number; mime_type: string; notes: string; archived_at: number; file_key: string; }

function fmtDate(ts: number | string | null | undefined): string {
  if (!ts) return "";
  return new Date(Number(ts)).toLocaleDateString("ko-KR");
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

export default function BoxPage() {
  const [items, setItems] = useState<BoxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/v1/box").then(r => r.json()).then(d => {
      if (d.items) setItems(d.items);
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
      if (d.item) setItems(prev => [d.item, ...prev]);
      else alert(d.error ?? "업로드 실패");
    } catch (err) {
      console.error("Upload error:", err);
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

  async function deleteItem(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/box/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function getMimeIcon(mime: string) {
    if (mime.startsWith("image/")) return "🖼";
    if (mime.startsWith("video/")) return "🎬";
    if (mime.startsWith("audio/")) return "🎵";
    if (mime.includes("pdf")) return "📄";
    if (mime.includes("zip") || mime.includes("tar")) return "📦";
    return "📁";
  }

  return (
    <div style={{ padding: "32px", maxWidth: "900px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "4px" }}>KRL Box</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>디지털 보관함</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input ref={fileInput} type="file" style={{ display: "none" }} onChange={handleUpload} />
          <button onClick={() => fileInput.current?.click()} disabled={uploading} style={{ padding: "8px 20px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.9375rem", fontWeight: 600 }}>
            {uploading ? "업로드 중..." : "파일 보관하기"}
          </button>
        </div>
      </div>

      {loading ? <div style={{ color: "var(--color-muted)" }}>로딩 중...</div> : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--color-muted)" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📦</div>
          <p>보관된 파일이 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {items.map(item => (
            <div key={item.id} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "24px" }}>{getMimeIcon(item.mime_type)}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: "var(--color-ink)", marginBottom: "2px" }}>{item.original_name}</p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                    {formatSize(item.file_size)} · {fmtDate(item.archived_at)}
                  </p>
                </div>
                <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "4px" }}>✕</button>
              </div>
              {/* Notes */}
              <div style={{ marginTop: "8px", display: "flex", gap: "6px" }}>
                <input
                  value={editNotes[item.id] ?? item.notes ?? ""}
                  onChange={e => setEditNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                  placeholder="메모 추가..."
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
