"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface Post {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  tags: string | null;
  status: string;
  author_email: string;
  created_at: number;
  published_at: number | null;
}

// ─── Markdown toolbar ─────────────────────────────────────────────────────────
function ToolbarBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={title} style={{
      padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--color-hairline-strong)",
      background: "var(--color-canvas)", cursor: "pointer", fontSize: "0.8125rem",
      color: "var(--color-ink)", lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
    }}>
      {children}
    </button>
  );
}

function MarkdownEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!preview) return;
    import("marked").then(({ marked }) => {
      setPreviewHtml(marked(value, { breaks: true, gfm: true, async: false }));
    });
  }, [preview, value]);

  function wrap(before: string, after: string, placeholder: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + sel.length);
    }, 0);
  }

  function insertLine(prefix: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = value.indexOf("\n", start);
    const end = lineEnd === -1 ? value.length : lineEnd;
    const line = value.slice(lineStart, end);
    const hasPrefix = line.startsWith(prefix);
    const next = value.slice(0, lineStart) + (hasPrefix ? line.slice(prefix.length) : prefix + line) + value.slice(end);
    onChange(next);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + (hasPrefix ? -prefix.length : prefix.length), start + (hasPrefix ? -prefix.length : prefix.length)); }, 0);
  }

  async function insertLink() {
    const url = prompt("링크 URL을 입력하세요:");
    if (!url) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end) || "링크 텍스트";
    const next = value.slice(0, start) + `[${sel}](${url})` + value.slice(end);
    onChange(next);
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/blog/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        const ta = textareaRef.current;
        if (!ta) return;
        const cursor = ta.selectionStart;
        const insert = `![${file.name}](${data.url})`;
        onChange(value.slice(0, cursor) + insert + value.slice(cursor));
      }
    } finally {
      setUploading(false);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith("image/"));
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) handleImageUpload(file);
    }
  }

  const TOOLBAR = [
    { title: "굵게 (Ctrl+B)", label: <b>B</b>, action: () => wrap("**", "**", "굵게") },
    { title: "기울임 (Ctrl+I)", label: <i>I</i>, action: () => wrap("*", "*", "기울임") },
    { title: "취소선", label: <s>S</s>, action: () => wrap("~~", "~~", "취소선") },
    { title: "H1", label: "H1", action: () => insertLine("# ") },
    { title: "H2", label: "H2", action: () => insertLine("## ") },
    { title: "H3", label: "H3", action: () => insertLine("### ") },
    { title: "인용", label: "> ", action: () => insertLine("> ") },
    { title: "목록", label: "• ", action: () => insertLine("- ") },
    { title: "번호 목록", label: "1.", action: () => insertLine("1. ") },
    { title: "코드", label: "`C`", action: () => wrap("`", "`", "코드") },
    { title: "코드 블록", label: "```", action: () => wrap("```\n", "\n```", "코드") },
    { title: "구분선", label: "—", action: () => { const ta = textareaRef.current; if (!ta) return; const c = ta.selectionStart; onChange(value.slice(0, c) + "\n---\n" + value.slice(c)); } },
    { title: "링크", label: "🔗", action: insertLink },
  ];

  return (
    <div style={{ border: "1px solid var(--color-hairline-strong)", borderRadius: "12px", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", gap: "4px", padding: "8px 12px", flexWrap: "wrap",
        background: "var(--color-lifted)", borderBottom: "1px solid var(--color-hairline-strong)",
        alignItems: "center",
      }}>
        {TOOLBAR.map((item, i) => (
          <ToolbarBtn key={i} title={item.title} onClick={item.action}>{item.label}</ToolbarBtn>
        ))}
        <div style={{ width: "1px", height: "20px", background: "var(--color-hairline-strong)", margin: "0 4px" }} />
        <ToolbarBtn title="이미지 업로드" onClick={() => fileInputRef.current?.click()}>
          {uploading ? "..." : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          )}
        </ToolbarBtn>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />
        <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
          <button type="button" onClick={() => setPreview(false)} style={{
            padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--color-hairline-strong)",
            background: !preview ? "var(--color-ink)" : "var(--color-canvas)",
            color: !preview ? "var(--color-canvas)" : "var(--color-ink)",
            cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
          }}>편집</button>
          <button type="button" onClick={() => setPreview(true)} style={{
            padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--color-hairline-strong)",
            background: preview ? "var(--color-ink)" : "var(--color-canvas)",
            color: preview ? "var(--color-canvas)" : "var(--color-ink)",
            cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
          }}>미리보기</button>
        </div>
      </div>

      {preview ? (
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
          style={{ padding: "20px 24px", minHeight: "400px", fontSize: "0.9375rem", lineHeight: 1.7, color: "var(--color-body)" }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={"# 제목\n\n내용을 마크다운으로 작성하세요.\n\n이미지는 클립보드에서 붙여넣기 또는 툴바 버튼으로 업로드할 수 있습니다."}
          style={{
            width: "100%", minHeight: "420px", padding: "20px 24px",
            border: "none", outline: "none", resize: "vertical",
            fontFamily: "var(--font-mono)", fontSize: "0.9rem", lineHeight: 1.7,
            background: "var(--color-canvas)", color: "var(--color-ink)",
            boxSizing: "border-box",
          }}
        />
      )}
      <style>{`
        .blog-content h1,.blog-content h2,.blog-content h3,.blog-content h4{font-weight:700;letter-spacing:-0.02em;margin-top:1.5em;margin-bottom:0.4em;color:var(--color-ink)}
        .blog-content h2{font-size:1.25rem;padding-bottom:6px;border-bottom:1px solid var(--color-hairline)}
        .blog-content p{margin-bottom:1em}.blog-content ul,.blog-content ol{padding-left:1.5em;margin-bottom:1em}
        .blog-content a{color:var(--color-arc);text-decoration:underline}
        .blog-content blockquote{margin:1em 0;padding:10px 16px;border-left:3px solid var(--color-arc);background:var(--color-lifted);border-radius:0 6px 6px 0;color:var(--color-muted)}
        .blog-content code{font-family:var(--font-mono);font-size:0.875em;background:var(--color-lifted);border:1px solid var(--color-hairline-strong);border-radius:4px;padding:2px 5px}
        .blog-content pre{background:var(--color-ink);border-radius:10px;padding:16px;overflow-x:auto;margin-bottom:1em}
        .blog-content pre code{background:none;border:none;padding:0;color:#e5e7eb;font-size:0.875rem}
        .blog-content img{max-width:100%;border-radius:8px;border:1px solid var(--color-hairline)}
        .blog-content hr{border:none;border-top:1px solid var(--color-hairline);margin:1.5em 0}
        .blog-content table{width:100%;border-collapse:collapse;margin-bottom:1em;font-size:0.9rem}
        .blog-content th,.blog-content td{border:1px solid var(--color-hairline-strong);padding:8px 12px;text-align:left}
        .blog-content th{background:var(--color-lifted);font-weight:600}
      `}</style>
    </div>
  );
}

// ─── Post editor form ─────────────────────────────────────────────────────────
function PostForm({ initial, onSave, onCancel }: {
  initial?: Partial<Post>;
  onSave: (data: Partial<Post>) => Promise<{ slug?: string }>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [coverImage, setCoverImage] = useState(initial?.cover_image ?? "");
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [status, setStatus] = useState(initial?.status ?? "draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const slugFromTitle = useCallback((t: string) =>
    t.toLowerCase().replace(/[^a-z0-9가-힣\s-]/g, "").replace(/[\s]+/g, "-").replace(/-+/g, "-").slice(0, 80)
  , []);

  function handleTitleChange(v: string) {
    setTitle(v);
    if (!initial?.slug) setSlug(slugFromTitle(v));
  }

  async function uploadCover(file: File) {
    setUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/blog/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setCoverImage(data.url);
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) { setError("제목과 내용을 입력하세요."); return; }
    if (!slug.trim()) { setError("슬러그를 입력하세요."); return; }
    setSaving(true); setError("");
    try {
      await onSave({ title, slug, excerpt, content, cover_image: coverImage || null, tags, status });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Cover image */}
      <div>
        <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "8px" }}>커버 이미지</label>
        {coverImage ? (
          <div style={{ position: "relative", display: "inline-block" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImage} alt="커버" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "10px", border: "1px solid var(--color-hairline)", objectFit: "cover" }} />
            <button type="button" onClick={() => setCoverImage("")} style={{ position: "absolute", top: "6px", right: "6px", width: "24px", height: "24px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "white", border: "none", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input value={coverImage} onChange={e => setCoverImage(e.target.value)} className="input" placeholder="이미지 URL 입력 또는 업로드" style={{ flex: 1 }} />
            <button type="button" onClick={() => coverInputRef.current?.click()} className="btn btn-secondary btn-sm">
              {uploadingCover ? "업로드 중..." : "이미지 업로드"}
            </button>
          </div>
        )}
        <input ref={coverInputRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ""; }} />
      </div>

      {/* Title */}
      <div>
        <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "6px" }}>제목 *</label>
        <input value={title} onChange={e => handleTitleChange(e.target.value)} className="input" placeholder="포스트 제목" />
      </div>

      {/* Slug */}
      <div>
        <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "6px" }}>
          슬러그 * <span style={{ fontWeight: 400, color: "var(--color-muted)" }}>— /blog/{slug || "slug"}</span>
        </label>
        <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"))} className="input" placeholder="url-slug" style={{ fontFamily: "var(--font-mono)" }} />
      </div>

      {/* Excerpt */}
      <div>
        <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "6px" }}>요약 <span style={{ fontWeight: 400, color: "var(--color-muted)" }}>(선택)</span></label>
        <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} className="input" rows={2} placeholder="목록 페이지에 표시될 짧은 설명" style={{ resize: "vertical" }} />
      </div>

      {/* Tags */}
      <div>
        <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "6px" }}>태그 <span style={{ fontWeight: 400, color: "var(--color-muted)" }}>(쉼표로 구분)</span></label>
        <input value={tags} onChange={e => setTags(e.target.value)} className="input" placeholder="업데이트, 개발, 팁" />
      </div>

      {/* Content */}
      <div>
        <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "8px" }}>내용 * <span style={{ fontWeight: 400, color: "var(--color-muted)" }}>— 마크다운 지원</span></label>
        <MarkdownEditor value={content} onChange={setContent} />
      </div>

      {/* Status */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <label style={{ fontSize: "0.8125rem", fontWeight: 600 }}>상태:</label>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.875rem" }}>
          <input type="radio" name="status" value="draft" checked={status === "draft"} onChange={() => setStatus("draft")} />
          임시저장
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.875rem" }}>
          <input type="radio" name="status" value="published" checked={status === "published"} onChange={() => setStatus("published")} />
          게시
        </label>
      </div>

      {error && <p style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>{error}</p>}

      <div style={{ display: "flex", gap: "8px" }}>
        <button type="submit" disabled={saving} className="btn btn-primary btn-sm btn-pill">
          {saving ? "저장 중..." : status === "published" ? "게시" : "임시저장"}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary btn-sm btn-pill">취소</button>
      </div>
    </form>
  );
}

// ─── Main admin page ──────────────────────────────────────────────────────────
export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editing, setEditing] = useState<Post | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blog?admin=1");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(data: Partial<Post>): Promise<{ slug?: string }> {
    const res = await fetch("/api/admin/blog", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "저장 실패");
    setView("list");
    load();
    return result;
  }

  async function handleUpdate(data: Partial<Post>): Promise<{ slug?: string }> {
    if (!editing) return {};
    const res = await fetch(`/api/admin/blog/${editing.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "수정 실패");
    setView("list");
    setEditing(null);
    load();
    return result;
  }

  async function handleDelete(id: number) {
    await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    load();
  }

  if (view === "create") {
    return (
      <div style={{ padding: "32px", maxWidth: "900px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <button onClick={() => setView("list")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            목록으로
          </button>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em" }}>새 포스트 작성</h1>
        </div>
        <PostForm onSave={handleCreate} onCancel={() => setView("list")} />
      </div>
    );
  }

  if (view === "edit" && editing) {
    return (
      <div style={{ padding: "32px", maxWidth: "900px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <button onClick={() => { setView("list"); setEditing(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            목록으로
          </button>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em" }}>포스트 수정</h1>
        </div>
        <PostForm initial={editing} onSave={handleUpdate} onCancel={() => { setView("list"); setEditing(null); }} />
      </div>
    );
  }

  return (
    <div style={{ padding: "32px", maxWidth: "900px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em" }}>블로그 관리</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginTop: "4px" }}>/blog 페이지의 포스트를 작성하고 관리합니다.</p>
        </div>
        <button onClick={() => setView("create")} className="btn btn-primary btn-sm btn-pill">+ 새 포스트</button>
      </div>

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "var(--color-muted)" }}>로딩 중...</div>
      ) : posts.length === 0 ? (
        <div style={{ padding: "60px", textAlign: "center", color: "var(--color-muted)", background: "var(--color-lifted)", borderRadius: "16px", border: "1px solid var(--color-hairline)" }}>
          아직 포스트가 없습니다.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {posts.map((post) => (
            <div key={post.id} style={{
              background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
              borderRadius: "12px", padding: "16px 20px",
              display: "flex", gap: "16px", alignItems: "center",
            }}>
              {post.cover_image && (
                <div style={{ width: "64px", height: "48px", flexShrink: 0, borderRadius: "8px", overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.cover_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 700, padding: "1px 7px", borderRadius: "5px",
                    background: post.status === "published" ? "#ECFDF5" : "var(--color-lifted)",
                    color: post.status === "published" ? "#059669" : "var(--color-muted)",
                    border: "1px solid", borderColor: post.status === "published" ? "#059669" : "var(--color-hairline-strong)",
                  }}>{post.status === "published" ? "게시됨" : "임시저장"}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-muted)" }}>/blog/{post.slug}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--color-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {post.title}
                </div>
                {post.tags && (
                  <div style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "3px" }}>{post.tags}</div>
                )}
              </div>
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                {post.status === "published" && (
                  <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm btn-icon" title="공개 링크">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                  </a>
                )}
                <button onClick={() => { setEditing(post); setView("edit"); }} className="btn btn-ghost btn-sm btn-icon" title="수정">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                </button>
                <button onClick={() => setDeleteConfirm(post.id)} className="btn btn-ghost btn-sm btn-icon" title="삭제" style={{ color: "var(--color-danger)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "var(--color-canvas)", borderRadius: "16px", padding: "28px", maxWidth: "360px", width: "90%" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px" }}>삭제 확인</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "20px" }}>이 포스트를 삭제하시겠습니까?</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn btn-primary btn-sm btn-pill" style={{ background: "var(--color-danger)", borderColor: "var(--color-danger)" }}>삭제</button>
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary btn-sm btn-pill">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
