"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DocEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/v1/docs/${id}`).then(r => r.json()).then(d => {
      if (d.doc) {
        setTitle(d.doc.title);
        setContent(d.doc.content ?? "");
        setIsPublic(d.doc.is_public);
      }
      setLoading(false);
    }).catch(() => { router.push("/dashboard/docs"); });
  }, [id, router]);

  const save = useCallback(async (t: string, c: string, pub: boolean) => {
    setSaving(true);
    await fetch(`/api/v1/docs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t, content: c, is_public: pub }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [id]);

  function scheduleAutoSave(t: string, c: string, pub: boolean) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(t, c, pub), 2000);
  }

  function renderMarkdown(md: string): string {
    return md
      .replace(/^### (.+)$/gm, '<h3 style="font-size:1.1rem;font-weight:700;margin:16px 0 8px">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 style="font-size:1.25rem;font-weight:700;margin:20px 0 10px">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 style="font-size:1.5rem;font-weight:700;margin:24px 0 12px">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:var(--color-surface);padding:2px 5px;border-radius:3px;font-family:monospace">$1</code>')
      .replace(/^- (.+)$/gm, '<li style="margin:4px 0">$1</li>')
      .replace(/\n\n/g, '<br/><br/>');
  }

  if (loading) return <div style={{ padding: "32px", color: "var(--color-muted)" }}>로딩 중...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 54px)" }}>
      {/* Toolbar */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <input
          value={title}
          onChange={e => { setTitle(e.target.value); scheduleAutoSave(e.target.value, content, isPublic); }}
          style={{ fontSize: "1.25rem", fontWeight: 700, border: "none", outline: "none", background: "transparent", color: "var(--color-ink)", flex: 1 }}
          placeholder="문서 제목"
        />
        <button onClick={() => setPreview(!preview)} style={{ padding: "6px 12px", border: "1px solid var(--color-hairline)", borderRadius: "6px", background: preview ? "var(--color-accent)" : "var(--color-surface)", color: preview ? "white" : "var(--color-ink)", cursor: "pointer", fontSize: "0.875rem" }}>
          {preview ? "편집" : "미리보기"}
        </button>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.875rem", cursor: "pointer" }}>
          <input type="checkbox" checked={isPublic} onChange={e => { setIsPublic(e.target.checked); scheduleAutoSave(title, content, e.target.checked); }} />
          공개
        </label>
        <button onClick={() => save(title, content, isPublic)} disabled={saving} style={{ padding: "6px 16px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem" }}>
          {saved ? "저장됨" : saving ? "저장 중..." : "저장"}
        </button>
      </div>

      {/* Editor / Preview */}
      {preview ? (
        <div style={{ flex: 1, padding: "32px 48px", overflowY: "auto", lineHeight: 1.8, color: "var(--color-ink)" }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
      ) : (
        <textarea
          value={content}
          onChange={e => { setContent(e.target.value); scheduleAutoSave(title, e.target.value, isPublic); }}
          placeholder="마크다운으로 작성하세요..."
          style={{ flex: 1, padding: "32px 48px", border: "none", outline: "none", resize: "none", fontSize: "0.9375rem", lineHeight: 1.8, background: "transparent", color: "var(--color-ink)", fontFamily: "var(--font-mono)" }}
        />
      )}
    </div>
  );
}
