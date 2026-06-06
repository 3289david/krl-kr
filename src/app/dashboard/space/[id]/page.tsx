"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Site { id: string; name: string; slug: string; primary_color: string; is_public: boolean; description?: string; }
interface Page { id: string; slug: string; title: string; content: string; is_published: boolean; sort_order: number; }
interface Block { type: string; content: string; level?: number; url?: string; alt?: string; }

const BLOCK_TYPES = [
  { key: "heading", label: "제목" },
  { key: "text", label: "텍스트" },
  { key: "image", label: "이미지" },
  { key: "button", label: "버튼" },
  { key: "divider", label: "구분선" },
];

function parseBlocks(content: string): Block[] {
  try { return JSON.parse(content) as Block[]; } catch { return []; }
}

function BlockPreview({ block }: { block: Block }) {
  const style: React.CSSProperties = { marginBottom: "8px" };
  if (block.type === "heading") return <div style={{ ...style, fontSize: "1.5rem", fontWeight: 700 }}>{block.content}</div>;
  if (block.type === "text") return <div style={{ ...style, fontSize: "1rem", lineHeight: 1.7 }}>{block.content}</div>;
  if (block.type === "image") return <img src={block.url ?? ""} alt={block.alt ?? ""} style={{ ...style, maxWidth: "100%", borderRadius: "8px" }} />;
  if (block.type === "button") return <div style={{ ...style }}><button style={{ padding: "10px 24px", background: "#6366f1", color: "white", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>{block.content}</button></div>;
  if (block.type === "divider") return <hr style={{ ...style, border: "none", borderTop: "1px solid var(--color-hairline)" }} />;
  return null;
}

export default function SpaceEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [site, setSite] = useState<Site | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPage, setNewPage] = useState({ slug: "", title: "" });
  const [saving, setSaving] = useState(false);
  const [editingBlockIdx, setEditingBlockIdx] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: "", description: "", primary_color: "#6366f1" });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/space/${id}`).then(r => r.json()).then(d => {
      if (d.site) {
        setSite(d.site);
        setSettingsForm({ name: d.site.name, description: d.site.description ?? "", primary_color: d.site.primary_color });
      }
    });
    fetch(`/api/v1/space/${id}/pages`).then(r => r.json()).then(d => { if (d.pages) setPages(d.pages); });
  }, [id]);

  async function saveSettings() {
    if (!site) return;
    setSavingSettings(true);
    const r = await fetch(`/api/v1/space/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsForm),
    });
    const d = await r.json();
    if (d.site) setSite(d.site);
    setSavingSettings(false);
  }

  async function togglePublic() {
    if (!site) return;
    const r = await fetch(`/api/v1/space/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: !site.is_public }),
    });
    const d = await r.json();
    if (d.site) setSite(d.site);
  }

  async function deleteSite() {
    if (!confirm("사이트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    await fetch(`/api/v1/space/${id}`, { method: "DELETE" });
    router.push("/dashboard/space");
  }

  function selectPage(page: Page) {
    setSelectedPage(page);
    setBlocks(parseBlocks(page.content));
    setEditingBlockIdx(null);
  }

  async function createPage() {
    if (!newPage.slug || !newPage.title) return;
    const r = await fetch(`/api/v1/space/${id}/pages`, {
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
    await fetch(`/api/v1/space/${id}/pages/${selectedPage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: blocks }),
    });
    setSaving(false);
  }

  function addBlock(type: string) {
    const block: Block = { type, content: type === "divider" ? "" : `새 ${BLOCK_TYPES.find(t => t.key === type)?.label ?? type}` };
    setBlocks(prev => [...prev, block]);
  }

  function updateBlock(idx: number, patch: Partial<Block>) {
    setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, ...patch } : b));
  }

  function removeBlock(idx: number) {
    setBlocks(prev => prev.filter((_, i) => i !== idx));
  }

  function moveBlock(idx: number, dir: -1 | 1) {
    const arr = [...blocks];
    const swap = idx + dir;
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    setBlocks(arr);
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 54px)", overflow: "hidden" }}>
      {/* Page sidebar */}
      <div style={{ width: "200px", borderRight: "1px solid var(--color-hairline)", padding: "16px 0", flexShrink: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 12px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-ink)" }}>{site?.name ?? "사이트"}</span>
          <div style={{ display: "flex", gap: "4px" }}>
            <button onClick={() => setShowSettings(!showSettings)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "0.85rem", padding: "2px" }} title="설정">⚙</button>
            <button onClick={() => setShowNewPage(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", fontSize: "1.1rem" }}>+</button>
          </div>
        </div>
        {site && (
          <div style={{ padding: "0 12px 8px" }}>
            {site.is_public ? (
              <a href={`https://krl.kr/space/${site.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.7rem", color: "var(--color-accent)", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                ↗ krl.kr/space/{site.slug}
              </a>
            ) : (
              <span style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>비공개</span>
            )}
          </div>
        )}
        {showSettings && site && (
          <div style={{ margin: "0 8px 12px", background: "var(--color-surface)", borderRadius: "8px", padding: "10px", border: "1px solid var(--color-hairline)", display: "flex", flexDirection: "column", gap: "6px" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", marginBottom: "4px" }}>사이트 설정</p>
            <input value={settingsForm.name} onChange={e => setSettingsForm(p => ({ ...p, name: e.target.value }))} placeholder="사이트 이름" style={{ padding: "4px 8px", border: "1px solid var(--color-hairline)", borderRadius: "4px", fontSize: "0.8rem", background: "var(--color-lifted)", color: "var(--color-ink)" }} />
            <input value={settingsForm.description} onChange={e => setSettingsForm(p => ({ ...p, description: e.target.value }))} placeholder="설명" style={{ padding: "4px 8px", border: "1px solid var(--color-hairline)", borderRadius: "4px", fontSize: "0.8rem", background: "var(--color-lifted)", color: "var(--color-ink)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label style={{ fontSize: "0.75rem" }}>색상:</label>
              <input type="color" value={settingsForm.primary_color} onChange={e => setSettingsForm(p => ({ ...p, primary_color: e.target.value }))} style={{ width: "32px", height: "24px", border: "none", padding: 0, cursor: "pointer", borderRadius: "3px" }} />
            </div>
            <button onClick={togglePublic} style={{ padding: "4px 8px", border: "1px solid var(--color-hairline)", borderRadius: "4px", background: site.is_public ? "#10b98120" : "transparent", color: site.is_public ? "#10b981" : "var(--color-muted)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
              {site.is_public ? "✓ 공개" : "비공개"}
            </button>
            <button onClick={saveSettings} disabled={savingSettings} style={{ padding: "4px 8px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}>
              {savingSettings ? "저장 중..." : "저장"}
            </button>
            <button onClick={deleteSite} style={{ padding: "4px 8px", background: "#ef444420", color: "#ef4444", border: "1px solid #ef444440", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}>삭제</button>
          </div>
        )}
        {showNewPage && (
          <div style={{ padding: "4px 12px 8px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <input value={newPage.slug} onChange={e => setNewPage(p => ({ ...p, slug: e.target.value }))} placeholder="슬러그" style={{ padding: "4px 8px", border: "1px solid var(--color-hairline)", borderRadius: "4px", fontSize: "0.8125rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <input value={newPage.title} onChange={e => setNewPage(p => ({ ...p, title: e.target.value }))} onKeyDown={e => e.key === "Enter" && createPage()} placeholder="제목" style={{ padding: "4px 8px", border: "1px solid var(--color-hairline)", borderRadius: "4px", fontSize: "0.8125rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <div style={{ display: "flex", gap: "4px" }}>
              <button onClick={createPage} style={{ flex: 1, padding: "4px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.8125rem" }}>추가</button>
              <button onClick={() => setShowNewPage(false)} style={{ padding: "4px 8px", border: "1px solid var(--color-hairline)", borderRadius: "4px", background: "transparent", cursor: "pointer", fontSize: "0.8125rem" }}>✕</button>
            </div>
          </div>
        )}
        {pages.map(page => (
          <div key={page.id} onClick={() => selectPage(page)} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.875rem", background: selectedPage?.id === page.id ? "var(--color-surface-card)" : "transparent", color: "var(--color-ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{page.title}</span>
            {!page.is_published && <span style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>비공개</span>}
          </div>
        ))}
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedPage ? (
          <>
            {/* Toolbar */}
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{selectedPage.title}</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                <button onClick={() => setPreviewMode(!previewMode)} style={{ padding: "5px 12px", border: `1px solid ${previewMode ? "var(--color-accent)" : "var(--color-hairline)"}`, borderRadius: "6px", background: previewMode ? "var(--color-accent)" : "transparent", color: previewMode ? "white" : "var(--color-body)", cursor: "pointer", fontSize: "0.8125rem" }}>
                  {previewMode ? "편집" : "미리보기"}
                </button>
                <button onClick={savePage} disabled={saving} style={{ padding: "5px 12px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.8125rem" }}>
                  {saving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
              {/* Blocks editor */}
              <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                {previewMode ? (
                  <div style={{ maxWidth: "700px", margin: "0 auto" }}>
                    {blocks.map((block, i) => <BlockPreview key={i} block={block} />)}
                    {blocks.length === 0 && <p style={{ color: "var(--color-muted)" }}>블록이 없습니다.</p>}
                  </div>
                ) : (
                  <>
                    {blocks.map((block, idx) => (
                      <div key={idx} style={{ background: editingBlockIdx === idx ? "var(--color-surface-card)" : "var(--color-lifted)", border: `1px solid ${editingBlockIdx === idx ? "var(--color-accent)" : "var(--color-hairline)"}`, borderRadius: "10px", padding: "12px", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: editingBlockIdx === idx ? "10px" : 0 }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", fontWeight: 600 }}>{BLOCK_TYPES.find(t => t.key === block.type)?.label ?? block.type}</span>
                          <div style={{ flex: 1, fontSize: "0.875rem", color: "var(--color-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {block.type !== "divider" && block.content}
                          </div>
                          <button onClick={() => setEditingBlockIdx(editingBlockIdx === idx ? null : idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "0.8125rem", padding: "2px 6px" }}>✏</button>
                          <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "2px" }}>↑</button>
                          <button onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "2px" }}>↓</button>
                          <button onClick={() => removeBlock(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "2px" }}>✕</button>
                        </div>
                        {editingBlockIdx === idx && block.type !== "divider" && (
                          <input value={block.type === "image" ? (block.url ?? "") : block.content} onChange={e => block.type === "image" ? updateBlock(idx, { url: e.target.value }) : updateBlock(idx, { content: e.target.value })} placeholder={block.type === "image" ? "이미지 URL" : "내용"} style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
                        )}
                      </div>
                    ))}

                    {/* Add block buttons */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
                      {BLOCK_TYPES.map(t => (
                        <button key={t.key} onClick={() => addBlock(t.key)} style={{ padding: "6px 12px", border: "1px dashed var(--color-hairline)", borderRadius: "6px", background: "transparent", cursor: "pointer", fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                          + {t.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-muted)" }}>
            <div style={{ textAlign: "center" }}>
              <p>페이지를 선택하거나 새 페이지를 만드세요.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
