"use client";
import { useState, useEffect, useCallback } from "react";
import { ShareButton } from "@/components/share-button";

interface Folder { id: string; name: string; color: string; }
interface Note { id: string; title: string; content: string; folder_id: string | null; tags: string[]; is_pinned: boolean; updated_at: number; is_public?: boolean; share_token?: string | null; }

function fmtDate(ts: number | string | null | undefined): string {
  if (!ts) return "";
  return new Date(Number(ts)).toLocaleDateString("ko-KR");
}

export default function NotesPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  // Mobile: which panel is visible — "list" | "editor"
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");

  const loadFolders = useCallback(async () => {
    const r = await fetch("/api/v1/notes/folders");
    const d = await r.json();
    if (d.folders) setFolders(d.folders);
  }, []);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    let url = "/api/v1/notes?";
    if (selectedFolder) url += `folder_id=${selectedFolder}&`;
    if (search) url += `q=${encodeURIComponent(search)}&`;
    const r = await fetch(url);
    const d = await r.json();
    if (d.notes) setNotes(d.notes);
    setLoading(false);
  }, [selectedFolder, search]);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { loadNotes(); }, [loadNotes]);

  async function createNote() {
    if (creating) return;
    setCreating(true);
    const r = await fetch("/api/v1/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "새 메모", content: "", folder_id: selectedFolder }),
    });
    const d = await r.json();
    if (d.note) {
      setNotes(prev => [d.note, ...prev]);
      selectNote(d.note);
    }
    setCreating(false);
  }

  function selectNote(note: Note) {
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setMobileView("editor");
  }

  async function saveNote() {
    if (!selectedNote) return;
    setSaving(true);
    const r = await fetch(`/api/v1/notes/${selectedNote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, content: editContent }),
    });
    const d = await r.json();
    if (d.note) {
      setNotes(prev => prev.map(n => n.id === d.note.id ? d.note : n));
      setSelectedNote(d.note);
    }
    setSaving(false);
  }

  async function deleteNote(id: string) {
    await fetch(`/api/v1/notes/${id}`, { method: "DELETE" });
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedNote?.id === id) { setSelectedNote(null); setMobileView("list"); }
  }

  async function togglePin(note: Note) {
    const r = await fetch(`/api/v1/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pinned: !note.is_pinned }),
    });
    const d = await r.json();
    if (d.note) setNotes(prev => prev.map(n => n.id === d.note.id ? d.note : n));
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    const r = await fetch("/api/v1/notes/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName }),
    });
    const d = await r.json();
    if (d.folder) { setFolders(prev => [...prev, d.folder]); setNewFolderName(""); setShowNewFolder(false); }
  }

  return (
    <div className="notes-page" style={{ display: "flex", height: "calc(100vh - 54px)", overflow: "hidden" }}>
      <style>{`
        @media (max-width: 768px) {
          .notes-page { flex-direction: column; height: auto; min-height: calc(100dvh - 54px - 60px); overflow: visible; }
          .notes-sidebar { width: 100% !important; border-right: none !important; border-bottom: 1px solid var(--color-hairline); flex-direction: row; overflow-x: auto; padding: 8px 12px !important; display: flex !important; align-items: center; gap: 6px; flex-wrap: nowrap; }
          .notes-sidebar-header { display: none !important; }
          .notes-folder-item { white-space: nowrap; border-radius: 20px !important; padding: 6px 12px !important; font-size: 0.8125rem; }
          .notes-list { width: 100% !important; border-right: none !important; border-bottom: 1px solid var(--color-hairline); max-height: 40vh; }
          .notes-editor { min-height: 50vh; flex: unset !important; }
          .notes-list-hidden { display: none !important; }
          .notes-editor-hidden { display: none !important; }
          .notes-mobile-back { display: flex !important; }
        }
        @media (min-width: 769px) {
          .notes-mobile-back { display: none !important; }
          .notes-mobile-toolbar { display: none !important; }
        }
      `}</style>

      {/* Sidebar — folders */}
      <div className="notes-sidebar" style={{ width: "220px", borderRight: "1px solid var(--color-hairline)", padding: "16px 0", flexShrink: 0, overflowY: "auto" }}>
        <div className="notes-sidebar-header" style={{ padding: "0 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-muted)" }}>폴더</span>
          <button onClick={() => setShowNewFolder(!showNewFolder)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "1.2rem", lineHeight: 1 }}>+</button>
        </div>
        {showNewFolder && (
          <div style={{ padding: "0 16px 8px", display: "flex", gap: "4px" }}>
            <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === "Enter" && createFolder()} placeholder="폴더 이름" style={{ flex: 1, padding: "4px 8px", border: "1px solid var(--color-hairline)", borderRadius: "4px", fontSize: "0.8125rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <button onClick={createFolder} style={{ padding: "4px 8px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.8125rem" }}>+</button>
          </div>
        )}
        {[{ id: null as string | null, name: "전체", color: "var(--color-muted)" }, ...folders.map(f => ({ ...f, id: f.id as string | null }))].map(f => (
          <div key={f.id ?? "all"} className="notes-folder-item" style={{ padding: "8px 16px", cursor: "pointer", fontSize: "0.875rem", fontWeight: selectedFolder === f.id ? 600 : 400, background: selectedFolder === f.id ? "var(--color-surface-card)" : "transparent", color: selectedFolder === f.id ? "var(--color-ink)" : "var(--color-body)", display: "flex", alignItems: "center", gap: "8px", borderRadius: 0 }}
            onClick={() => { setSelectedFolder(f.id); setMobileView("list"); }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: f.color, flexShrink: 0 }} />
            {f.name}
          </div>
        ))}
      </div>

      {/* Mobile toolbar — only visible on mobile when editor is open */}
      {mobileView === "editor" && (
        <div className="notes-mobile-back" style={{ display: "none", alignItems: "center", gap: "8px", padding: "8px 12px", borderBottom: "1px solid var(--color-hairline)", background: "var(--color-lifted)" }}>
          <button onClick={() => setMobileView("list")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", fontSize: "0.875rem", fontWeight: 600, padding: "4px 0", display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            목록으로
          </button>
        </div>
      )}

      {/* Notes list */}
      <div className={`notes-list${mobileView === "editor" ? " notes-list-hidden" : ""}`} style={{ width: "280px", borderRight: "1px solid var(--color-hairline)", overflowY: "auto" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-hairline)", display: "flex", gap: "8px" }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="검색..."
            style={{ flex: 1, padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }}
          />
          <button onClick={createNote} disabled={creating} style={{ padding: "6px 12px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", whiteSpace: "nowrap", opacity: creating ? 0.7 : 1 }}>{creating ? "..." : "+ 새 메모"}</button>
        </div>
        {loading ? (
          <div style={{ padding: "24px", color: "var(--color-muted)", fontSize: "0.875rem" }}>로딩 중...</div>
        ) : notes.length === 0 ? (
          <div style={{ padding: "24px", color: "var(--color-muted)", fontSize: "0.875rem", textAlign: "center" }}>메모가 없습니다.<br/>새 메모를 만들어보세요.</div>
        ) : notes.map(note => (
          <div key={note.id} style={{ padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid var(--color-hairline)", background: selectedNote?.id === note.id ? "var(--color-surface-card)" : "transparent" }} onClick={() => selectNote(note)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-ink)", display:"flex", alignItems:"center", gap:3 }}>{note.is_pinned && <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M5 5c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v5.17a3 3 0 0 1-.88 2.12L16 14.4V20a1 1 0 0 1-1.45.9L12 19.5l-2.55 1.4A1 1 0 0 1 8 20v-5.6l-2.12-2.1A3 3 0 0 1 5 10.17V5z"/></svg>}{note.title || "제목 없음"}</span>
              <div style={{ display: "flex", gap: "4px" }}>
                <button onClick={e => { e.stopPropagation(); togglePin(note); }} title={note.is_pinned ? "핀 해제" : "핀"} style={{ background: "none", border: "none", cursor: "pointer", color: note.is_pinned ? "var(--color-accent)" : "var(--color-muted)", padding: "2px", display:"flex" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={note.is_pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/></svg>
                </button>
                <button onClick={e => { e.stopPropagation(); deleteNote(note.id); }} title="삭제" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "2px", display:"flex" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note.content?.slice(0, 60) || "내용 없음"}</p>
            <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "4px", marginBottom: 0 }}>{fmtDate(note.updated_at)}</p>
            <div onClick={e => e.stopPropagation()} style={{ marginTop: 6 }}>
              <ShareButton type="note" id={Number(note.id)} initialPublic={note.is_public} initialToken={note.share_token} />
            </div>
          </div>
        ))}
      </div>

      {/* Editor */}
      <div className={`notes-editor${mobileView === "list" ? " notes-editor-hidden" : ""}`} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedNote ? (
          <>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--color-hairline)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                style={{ fontSize: "1.25rem", fontWeight: 700, border: "none", outline: "none", background: "transparent", color: "var(--color-ink)", flex: 1 }}
              />
              <button onClick={saveNote} disabled={saving} style={{ padding: "6px 16px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem" }}>
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              placeholder="메모를 입력하세요..."
              style={{ flex: 1, padding: "24px", border: "none", outline: "none", resize: "none", fontSize: "0.9375rem", lineHeight: 1.7, background: "transparent", color: "var(--color-ink)", fontFamily: "var(--font-sans)", minHeight: "300px" }}
            />
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--color-muted)", padding: "40px 20px", textAlign: "center" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: "16px", opacity: 0.4 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p>메모를 선택하거나 새 메모를 만드세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
