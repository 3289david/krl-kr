"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Wiki { id: string; name: string; }
interface Page { id: string; slug: string; title: string; content: string; parent_id: string | null; updated_at: number; }

export default function WikiViewPage() {
  const params = useParams();
  const id = params.id as string;
  const [wiki, setWiki] = useState<Wiki | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPage, setNewPage] = useState({ slug: "", title: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/wiki/${id}`).then(r => r.json()).then(d => { if (d.wiki) setWiki(d.wiki); });
    fetch(`/api/v1/wiki/${id}/pages`).then(r => r.json()).then(d => { if (d.pages) setPages(d.pages); });
  }, [id]);

  function selectPage(page: Page) {
    setSelectedPage(page);
    setEditTitle(page.title);
    setEditContent(page.content);
    setEditing(false);
  }

  async function createPage() {
    if (!newPage.slug || !newPage.title) return;
    const r = await fetch(`/api/v1/wiki/${id}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPage),
    });
    const d = await r.json();
    if (d.page) { setPages(prev => [...prev, d.page]); setShowNewPage(false); setNewPage({ slug: "", title: "" }); selectPage(d.page); }
  }

  async function savePage() {
    if (!selectedPage) return;
    setSaving(true);
    const r = await fetch(`/api/v1/wiki/${id}/pages/${selectedPage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, content: editContent }),
    });
    const d = await r.json();
    if (d.page) { setPages(prev => prev.map(p => p.id === d.page.id ? d.page : p)); setSelectedPage(d.page); setEditing(false); }
    setSaving(false);
  }

  async function deletePage(pageId: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/wiki/${id}/pages/${pageId}`, { method: "DELETE" });
    setPages(prev => prev.filter(p => p.id !== pageId));
    if (selectedPage?.id === pageId) setSelectedPage(null);
  }

  function renderMarkdown(md: string) {
    return md
      .replace(/^### (.+)$/gm, '<h3 style="font-size:1.05rem;font-weight:700;margin:14px 0 6px">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 style="font-size:1.2rem;font-weight:700;margin:18px 0 8px">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 style="font-size:1.4rem;font-weight:700;margin:22px 0 10px">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:var(--color-surface);padding:2px 5px;border-radius:3px">$1</code>')
      .replace(/\n\n/g, '<br/><br/>');
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 54px)", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: "220px", borderRight: "1px solid var(--color-hairline)", padding: "16px 0", flexShrink: 0, overflowY: "auto" }}>
        <div style={{ padding: "0 16px 8px" }}>
          <p style={{ fontWeight: 700, fontSize: "0.9375rem", marginBottom: "4px" }}>{wiki?.name ?? "위키"}</p>
          <button onClick={() => setShowNewPage(true)} style={{ fontSize: "0.8125rem", color: "var(--color-accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>+ 새 페이지</button>
        </div>
        {showNewPage && (
          <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <input value={newPage.slug} onChange={e => setNewPage(p => ({ ...p, slug: e.target.value }))} placeholder="슬러그" style={{ padding: "4px 8px", border: "1px solid var(--color-hairline)", borderRadius: "4px", fontSize: "0.8125rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <input value={newPage.title} onChange={e => setNewPage(p => ({ ...p, title: e.target.value }))} onKeyDown={e => e.key === "Enter" && createPage()} placeholder="제목" style={{ padding: "4px 8px", border: "1px solid var(--color-hairline)", borderRadius: "4px", fontSize: "0.8125rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <div style={{ display: "flex", gap: "4px" }}>
              <button onClick={createPage} style={{ flex: 1, padding: "4px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.8125rem" }}>만들기</button>
              <button onClick={() => setShowNewPage(false)} style={{ padding: "4px 8px", border: "1px solid var(--color-hairline)", borderRadius: "4px", background: "transparent", cursor: "pointer", fontSize: "0.8125rem" }}>✕</button>
            </div>
          </div>
        )}
        {pages.map(page => (
          <div key={page.id} onClick={() => selectPage(page)} style={{ padding: "8px 16px", cursor: "pointer", fontSize: "0.875rem", background: selectedPage?.id === page.id ? "var(--color-surface-card)" : "transparent", color: "var(--color-ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{page.title}</span>
            <button onClick={e => { e.stopPropagation(); deletePage(page.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "0.75rem", padding: "2px" }}>✕</button>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {selectedPage ? (
          <>
            <div style={{ padding: "16px 32px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: "12px" }}>
              {editing ? (
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ flex: 1, fontSize: "1.25rem", fontWeight: 700, border: "none", outline: "none", background: "transparent", color: "var(--color-ink)" }} />
              ) : (
                <h2 style={{ flex: 1, fontSize: "1.25rem", fontWeight: 700 }}>{selectedPage.title}</h2>
              )}
              {editing ? (
                <>
                  <button onClick={savePage} disabled={saving} style={{ padding: "6px 16px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem" }}>{saving ? "저장 중..." : "저장"}</button>
                  <button onClick={() => setEditing(false)} style={{ padding: "6px 12px", border: "1px solid var(--color-hairline)", borderRadius: "6px", background: "transparent", cursor: "pointer", fontSize: "0.875rem" }}>취소</button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} style={{ padding: "6px 14px", border: "1px solid var(--color-hairline)", borderRadius: "6px", background: "transparent", cursor: "pointer", fontSize: "0.875rem" }}>편집</button>
              )}
            </div>
            {editing ? (
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{ flex: 1, padding: "24px 32px", border: "none", outline: "none", resize: "none", fontSize: "0.9375rem", lineHeight: 1.7, background: "transparent", color: "var(--color-ink)", fontFamily: "var(--font-mono)" }} />
            ) : (
              <div style={{ flex: 1, padding: "24px 32px", overflowY: "auto", lineHeight: 1.8, color: "var(--color-ink)" }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedPage.content) }} />
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-muted)" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ marginBottom: "8px" }}>페이지를 선택하거나 새 페이지를 만드세요.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
