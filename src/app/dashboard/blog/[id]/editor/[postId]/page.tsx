"use client";
import { useState, useEffect, use, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface Post {
  id?: number;
  title: string;
  content: string;
  excerpt?: string;
  cover_image?: string;
  tags: string[];
  seo_title?: string;
  seo_description?: string;
  status: string;
}

function renderMd(md: string): string {
  if (!md.trim()) return "";
  // Process in order: code blocks first (prevent inner parsing)
  const blocks: string[] = [];
  let s = md
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const esc = code.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      blocks.push(`<pre style="background:#0d1117;color:#e6edf3;padding:20px 24px;border-radius:10px;overflow-x:auto;margin:1.4em 0;font-size:.875rem;line-height:1.7"><code>${esc}</code></pre>`);
      return `\x00B${blocks.length - 1}\x00`;
    })
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/`([^`\n]+)`/g, '<code style="background:#f1f5f9;border:1px solid #e2e8f0;padding:2px 7px;border-radius:5px;font-size:.875em">$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:10px;margin:1.2em 0;display:block">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#2563eb;text-decoration:underline" target="_blank" rel="noopener">$1</a>')
    .replace(/^#{6} (.+)$/gm, '<h6 style="font-size:1rem;font-weight:700;margin:1.4em 0 .4em">$1</h6>')
    .replace(/^#{5} (.+)$/gm, '<h5 style="font-size:1.0625rem;font-weight:700;margin:1.4em 0 .4em">$1</h5>')
    .replace(/^#{4} (.+)$/gm, '<h4 style="font-size:1.125rem;font-weight:700;margin:1.5em 0 .5em">$1</h4>')
    .replace(/^#{3} (.+)$/gm, '<h3 style="font-size:1.25rem;font-weight:700;margin:1.6em 0 .5em">$1</h3>')
    .replace(/^#{2} (.+)$/gm, '<h2 style="font-size:1.5rem;font-weight:700;margin:1.8em 0 .6em;padding-bottom:.3em;border-bottom:1px solid #e2e8f0">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:1.875rem;font-weight:800;margin:1.8em 0 .6em">$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/^(&gt;|>+) (.+)$/gm, '<blockquote style="border-left:4px solid #2563eb;margin:1.2em 0;padding:.8em 1.2em;background:#eff6ff;border-radius:0 8px 8px 0;color:#374151;font-style:italic"><p style="margin:0">$2</p></blockquote>')
    .replace(/^[-*+] \[x\] (.+)$/gm, '<li style="margin:.3em 0;list-style:none">☑ $1</li>')
    .replace(/^[-*+] \[ \] (.+)$/gm, '<li style="margin:.3em 0;list-style:none">☐ $1</li>')
    .replace(/^[-*+] (.+)$/gm, '<li style="margin:.3em 0">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li style="margin:.3em 0">$2</li>')
    .replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, m => `<ul style="margin:.6em 0 1em 1.4em">${m}</ul>`)
    .replace(/^(---|\*\*\*|___)\s*$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:2em 0">')
    .split("\n\n").map(chunk => {
      if (chunk.startsWith("<h") || chunk.startsWith("<ul") || chunk.startsWith("<blockquote") || chunk.startsWith("<hr") || chunk.startsWith("\x00B")) return chunk;
      return `<p style="margin-bottom:1.4em">${chunk.replace(/\n/g, "<br>")}</p>`;
    }).join("");
  return s.replace(/\x00B(\d+)\x00/g, (_, i) => blocks[parseInt(i)]);
}

type Params = { id: string; postId?: string };

export default function EditorPage({ params }: { params: Promise<Params> }) {
  const resolved = use(params);
  const blogId = resolved.id;
  const postId = resolved.postId;
  const isNew = !postId;
  const router = useRouter();

  const [post, setPost] = useState<Post>({ title: "", content: "", tags: [], status: "draft" });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState<"split" | "write" | "preview">("split");
  const [tagInput, setTagInput] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [driveImages, setDriveImages] = useState<{ id: number; name: string; share_token: string | null }[]>([]);
  const [showDrive, setShowDrive] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isNew && postId) {
      fetch(`/api/v1/blog/${blogId}/posts/${postId}`)
        .then(r => r.json())
        .then(d => { if (d.post) setPost({ ...d.post, tags: d.post.tags ?? [] }); })
        .finally(() => setLoading(false));
    }
  }, [blogId, postId, isNew]);

  const autoSave = useCallback(async (p: Post) => {
    if (!p.title.trim() && !p.content.trim()) return;
    try {
      if (post.id) {
        await fetch(`/api/v1/blog/${blogId}/posts/${post.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: p.title, content: p.content }),
        });
      }
    } catch {}
  }, [blogId, post.id]);

  function triggerAutoSave(p: Post) {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => autoSave(p), 5000);
  }

  function update(field: keyof Post, value: unknown) {
    const next = { ...post, [field]: value } as Post;
    setPost(next);
    if (field === "title" || field === "content") triggerAutoSave(next);
  }

  async function save(status?: string) {
    setSaving(true);
    const body = { ...post, status: status ?? post.status };
    try {
      let res: Response;
      if (isNew || !post.id) {
        res = await fetch(`/api/v1/blog/${blogId}/posts`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/v1/blog/${blogId}/posts/${post.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
      }
      const data = await res.json();
      if (res.ok) {
        setPost(p => ({ ...p, ...data.post, tags: data.post.tags ?? [] }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        if (isNew) router.replace(`/dashboard/blog/${blogId}/editor/${data.post.id}`);
      }
    } catch {}
    setSaving(false);
  }

  async function runAI(action: string) {
    setAiLoading(true);
    setAiResult("");
    try {
      const res = await fetch(`/api/v1/blog/${blogId}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, content: post.content, title: post.title }),
      });
      const data = await res.json();
      setAiResult(data.result ?? data.error ?? "오류");
    } catch { setAiResult("네트워크 오류"); }
    setAiLoading(false);
  }

  async function loadDriveImages() {
    const res = await fetch("/api/v1/drive");
    const data = await res.json();
    setDriveImages((data.files ?? []).filter((f: { mime_type: string | null }) => f.mime_type?.startsWith("image/")));
    setShowDrive(true);
  }

  async function insertDriveImage(file: { id: number; name: string; share_token: string | null }) {
    let token = file.share_token;
    if (!token) {
      const res = await fetch(`/api/v1/drive/${file.id}/share`, { method: "POST" });
      const data = await res.json();
      token = data.token;
    }
    const url = `https://krl.kr/api/v1/drive/share/${token}?preview=1`;
    wrapSelection(`![${file.name}](${url})`);
    setShowDrive(false);
  }

  function addTag(t: string) {
    const tag = t.trim().replace(/^#/, "");
    if (tag && !post.tags.includes(tag) && post.tags.length < 10) {
      update("tags", [...post.tags, tag]);
    }
    setTagInput("");
  }

  // ── Markdown toolbar helpers ──────────────────────────────────────────────

  function wrapSelection(before: string, after = "", placeholder = "텍스트") {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.slice(s, end) || placeholder;
    const newVal = ta.value.slice(0, s) + before + selected + after + ta.value.slice(end);
    update("content", newVal);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + selected.length);
    });
  }

  function prefixLine(prefix: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const lineStart = ta.value.lastIndexOf("\n", s - 1) + 1;
    const newVal = ta.value.slice(0, lineStart) + prefix + ta.value.slice(lineStart);
    update("content", newVal);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + prefix.length, s + prefix.length);
    });
  }

  function insertBlock(text: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const before = ta.value.slice(0, s);
    const after = ta.value.slice(s);
    const nl = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
    const newVal = before + nl + text + "\n" + after;
    update("content", newVal);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + nl.length + text.length + 1, s + nl.length + text.length + 1);
    });
  }

  const tools: { label: string; title: string; action: () => void }[] = [
    { label: "B", title: "굵게 (Ctrl+B)", action: () => wrapSelection("**", "**", "굵은 텍스트") },
    { label: "I", title: "기울임 (Ctrl+I)", action: () => wrapSelection("*", "*", "기울임 텍스트") },
    { label: "H2", title: "제목 2", action: () => prefixLine("## ") },
    { label: "H3", title: "제목 3", action: () => prefixLine("### ") },
    { label: "——", title: "구분선", action: () => insertBlock("\n---") },
    { label: "`코드`", title: "인라인 코드", action: () => wrapSelection("`", "`", "code") },
    { label: "```", title: "코드 블록", action: () => insertBlock("```\n코드를 입력하세요\n```") },
    { label: "❝", title: "인용", action: () => prefixLine("> ") },
    { label: "•", title: "목록", action: () => prefixLine("- ") },
    { label: "🔗", title: "링크", action: () => wrapSelection("[", "](https://)", "링크 텍스트") },
    { label: "🖼", title: "Drive 이미지", action: loadDriveImages },
  ];

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b") { e.preventDefault(); wrapSelection("**", "**", "굵은 텍스트"); }
      if (e.key === "i") { e.preventDefault(); wrapSelection("*", "*", "기울임 텍스트"); }
      if (e.key === "s") { e.preventDefault(); save("draft"); }
    }
  }

  const wordCount = post.content.trim().split(/\s+/).filter(Boolean).length;
  const readMin = Math.max(1, Math.ceil(wordCount / 200));

  if (loading) return <div className="dashboard-page"><p style={{ color: "var(--color-muted)" }}>불러오는 중...</p></div>;

  const btnBase: React.CSSProperties = {
    padding: "3px 8px", border: "1px solid var(--color-hairline)", borderRadius: 5,
    background: "var(--color-canvas)", color: "var(--color-ink)", cursor: "pointer",
    fontSize: "0.75rem", fontWeight: 600, fontFamily: "inherit", lineHeight: 1.5,
    transition: "background .12s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-canvas)", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--color-surface)", borderBottom: "1px solid var(--color-hairline)", padding: "10px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <a href={`/dashboard/blog/${blogId}`} style={{ color: "var(--color-muted)", fontSize: "0.875rem", textDecoration: "none" }}>← 목록</a>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4, background: "var(--color-canvas)", borderRadius: 8, padding: 2 }}>
          {(["write", "split", "preview"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: view === v ? "var(--color-surface)" : "none", cursor: "pointer", fontSize: "0.8125rem", fontWeight: view === v ? 600 : 400, color: "var(--color-ink)", fontFamily: "inherit" }}>
              {v === "write" ? "작성" : v === "split" ? "분할" : "미리보기"}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAI(v => !v)} className="btn btn-sm btn-ghost">✨ AI</button>
        <button onClick={() => setShowSettings(v => !v)} className="btn btn-sm btn-ghost">⚙ 설정</button>
        <button onClick={() => save("draft")} disabled={saving} className="btn btn-sm btn-ghost">
          {saving ? "저장 중..." : saved ? "✓ 저장됨" : "임시저장"}
        </button>
        <button onClick={() => save("published")} disabled={saving} className="btn btn-sm btn-primary">발행</button>
      </div>

      {/* AI panel */}
      {showAI && (
        <div style={{ background: "#f0f9ff", borderBottom: "1px solid #bae6fd", padding: "14px 20px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {[
                { action: "suggest_titles", label: "✨ 제목 추천" },
                { action: "summarize", label: "📝 요약" },
                { action: "generate_tags", label: "🏷 태그 생성" },
                { action: "generate_seo", label: "🔍 SEO 설명" },
                { action: "fix_spelling", label: "✏️ 맞춤법 교정" },
              ].map(({ action, label }) => (
                <button key={action} onClick={() => runAI(action)} disabled={aiLoading} className="btn btn-sm btn-ghost" style={{ fontSize: "0.8125rem" }}>{label}</button>
              ))}
            </div>
            {aiLoading && <p style={{ fontSize: "0.875rem", color: "#0369a1" }}>AI 분석 중...</p>}
            {aiResult && (
              <div style={{ background: "#fff", border: "1px solid #bae6fd", borderRadius: 8, padding: "12px 16px", fontSize: "0.875rem", whiteSpace: "pre-wrap", color: "#0c4a6e" }}>
                {aiResult}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-hairline)", padding: "16px 20px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: 5 }}>커버 이미지 URL</label>
              <input className="input" placeholder="https://..." value={post.cover_image ?? ""} onChange={e => update("cover_image", e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: 5 }}>SEO 제목</label>
              <input className="input" placeholder="SEO 제목 (비워두면 글 제목 사용)" value={post.seo_title ?? ""} onChange={e => update("seo_title", e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: 5 }}>SEO 설명</label>
              <input className="input" placeholder="검색 결과에 표시될 설명" value={post.seo_description ?? ""} onChange={e => update("seo_description", e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: 5 }}>발췌 (Excerpt)</label>
              <input className="input" placeholder="목록에 표시할 요약" value={post.excerpt ?? ""} onChange={e => update("excerpt", e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, marginBottom: 5 }}>태그</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                {post.tags.map(t => (
                  <span key={t} style={{ fontSize: "0.75rem", background: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: 99, display: "flex", alignItems: "center", gap: 4 }}>
                    #{t}
                    <button onClick={() => update("tags", post.tags.filter(x => x !== t))} style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
              <input className="input" placeholder="태그 입력 후 Enter" value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }} />
            </div>
          </div>
        </div>
      )}

      {/* Drive image picker */}
      {showDrive && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: 24, maxWidth: 640, width: "100%", maxHeight: "80vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 600 }}>Drive에서 이미지 선택</h3>
              <button onClick={() => setShowDrive(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem" }}>×</button>
            </div>
            {driveImages.length === 0 ? <p style={{ color: "var(--color-muted)" }}>Drive에 이미지가 없습니다.</p> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                {driveImages.map(f => (
                  <button key={f.id} onClick={() => insertDriveImage(f)} style={{ background: "var(--color-canvas)", border: "1px solid var(--color-hairline)", borderRadius: 8, padding: 8, cursor: "pointer", textAlign: "left" }}>
                    <div style={{ fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor area */}
      <div style={{ flex: 1, display: "flex", maxWidth: 1200, width: "100%", margin: "0 auto", padding: "0 20px" }}>
        {/* Write pane */}
        {(view === "write" || view === "split") && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: view === "split" ? "1px solid var(--color-hairline)" : "none", paddingRight: view === "split" ? 20 : 0 }}>
            <input
              value={post.title}
              onChange={e => update("title", e.target.value)}
              placeholder="글 제목을 입력하세요"
              style={{ border: "none", outline: "none", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em", padding: "32px 0 16px", background: "transparent", color: "var(--color-ink)", width: "100%", fontFamily: "inherit" }}
            />

            {/* Markdown toolbar */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--color-hairline)", borderBottom: "1px solid var(--color-hairline)", marginBottom: 16 }}>
              {tools.map(t => (
                <button
                  key={t.label}
                  title={t.title}
                  onClick={t.action}
                  style={t.label === "B" ? { ...btnBase, fontStyle: "normal" }
                    : t.label === "I" ? { ...btnBase, fontStyle: "italic" }
                    : btnBase}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--color-canvas)")}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              value={post.content}
              onChange={e => update("content", e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={"# 제목\n\n여기에 내용을 작성하세요. Markdown을 지원합니다.\n\n**굵게**, *기울임*, `코드`, [링크](url)\n\n```\n코드 블록\n```"}
              style={{ flex: 1, border: "none", outline: "none", resize: "none", fontSize: "1rem", lineHeight: 1.75, background: "transparent", color: "var(--color-ink)", fontFamily: "'JetBrains Mono', Consolas, monospace", paddingBottom: 40, minHeight: 400 }}
            />

            {/* Status bar */}
            <div style={{ padding: "8px 0 16px", borderTop: "1px solid var(--color-hairline)", fontSize: "0.75rem", color: "var(--color-muted)", display: "flex", gap: 16 }}>
              <span>단어 {wordCount.toLocaleString()}개</span>
              <span>약 {readMin}분 읽기</span>
              <span>글자 {post.content.length.toLocaleString()}자</span>
              <span style={{ marginLeft: "auto" }}>Ctrl+B 굵게 · Ctrl+I 기울임 · Ctrl+S 저장</span>
            </div>
          </div>
        )}

        {/* Preview pane — full markdown */}
        {(view === "preview" || view === "split") && (
          <div style={{ flex: 1, padding: view === "split" ? "32px 0 40px 24px" : "32px 0 40px", overflowY: "auto" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 8, letterSpacing: "-0.03em", color: "var(--color-ink)" }}>
              {post.title || "제목 없음"}
            </h1>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginBottom: 32 }}>
              약 {readMin}분 읽기 · {wordCount}단어
            </p>
            <div
              style={{ fontSize: "1rem", lineHeight: 1.85, color: "var(--color-ink)" }}
              dangerouslySetInnerHTML={{
                __html: post.content
                  ? renderMd(post.content)
                  : '<p style="color:var(--color-muted)">내용을 입력하면 미리보기가 표시됩니다.</p>'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
