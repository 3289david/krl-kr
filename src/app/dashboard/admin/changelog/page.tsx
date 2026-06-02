"use client";
import { useState, useEffect } from "react";

interface Entry {
  id: number;
  version: string;
  title: string;
  content: string;
  type: string;
  published: boolean;
  created_at: number;
}

const TYPES = [
  { value: "feature",     label: "새 기능" },
  { value: "improvement", label: "개선" },
  { value: "fix",         label: "버그 수정" },
  { value: "security",    label: "보안" },
  { value: "breaking",    label: "주요 변경" },
];

const TYPE_COLORS: Record<string, string> = {
  feature: "#2563eb", improvement: "#059669", fix: "#dc2626", security: "#7c3aed", breaking: "#ea580c",
};

function EntryForm({ initial, onSave, onCancel }: {
  initial?: Partial<Entry>;
  onSave: (data: Partial<Entry>) => Promise<void>;
  onCancel: () => void;
}) {
  const [version, setVersion] = useState(initial?.version ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [type, setType] = useState(initial?.type ?? "feature");
  const [published, setPublished] = useState(initial?.published ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!version.trim() || !title.trim() || !content.trim()) {
      setError("버전, 제목, 내용을 모두 입력하세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ version, title, content, type, published });
    } catch {
      setError("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "6px" }}>버전 *</label>
          <input value={version} onChange={e => setVersion(e.target.value)} className="input" placeholder="v1.0.0" />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "6px" }}>타입</label>
          <select value={type} onChange={e => setType(e.target.value)} className="input" style={{ cursor: "pointer" }}>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "6px" }}>제목 *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="업데이트 제목" />
      </div>

      <div>
        <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "6px" }}>
          내용 * <span style={{ fontWeight: 400, color: "var(--color-muted)" }}>— 줄마다 항목, - 로 시작</span>
        </label>
        <textarea
          value={content} onChange={e => setContent(e.target.value)}
          className="input" rows={8}
          placeholder={"- 새 기능 A 추가\n- 버그 B 수정\n- 성능 개선"}
          style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <input type="checkbox" id="pub" checked={published} onChange={e => setPublished(e.target.checked)} style={{ width: "16px", height: "16px" }} />
        <label htmlFor="pub" style={{ fontSize: "0.875rem", cursor: "pointer" }}>공개 (체크 해제 시 비공개)</label>
      </div>

      {error && <p style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>{error}</p>}

      <div style={{ display: "flex", gap: "8px" }}>
        <button type="submit" disabled={saving} className="btn btn-primary btn-sm btn-pill">
          {saving ? "저장 중..." : "저장"}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary btn-sm btn-pill">취소</button>
      </div>
    </form>
  );
}

export default function AdminChangelogPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/changelog?admin=1");
      const data = await res.json();
      setEntries(data.entries ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(data: Partial<Entry>) {
    const res = await fetch("/api/admin/changelog", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error();
    setShowCreate(false);
    load();
  }

  async function handleUpdate(data: Partial<Entry>) {
    if (!editing) return;
    const res = await fetch(`/api/admin/changelog/${editing.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error();
    setEditing(null);
    load();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/admin/changelog/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    load();
  }

  return (
    <div style={{ padding: "32px", maxWidth: "900px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em" }}>변경 이력 관리</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginTop: "4px" }}>
            /changelog 페이지에 표시되는 업데이트 내역을 관리합니다.
          </p>
        </div>
        {!showCreate && !editing && (
          <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm btn-pill">
            + 새 항목
          </button>
        )}
      </div>

      {showCreate && (
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "24px", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "20px" }}>새 변경 이력</h2>
          <EntryForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </div>
      )}

      {editing && (
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "24px", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "20px" }}>수정: {editing.title}</h2>
          <EntryForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />
        </div>
      )}

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "var(--color-muted)" }}>로딩 중...</div>
      ) : entries.length === 0 ? (
        <div style={{ padding: "60px", textAlign: "center", color: "var(--color-muted)", background: "var(--color-lifted)", borderRadius: "16px", border: "1px solid var(--color-hairline)" }}>
          아직 변경 이력이 없습니다.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {entries.map((entry) => {
            const color = TYPE_COLORS[entry.type] ?? "#2563eb";
            const typeLabel = TYPES.find(t => t.value === entry.type)?.label ?? entry.type;
            return (
              <div key={entry.id} style={{
                background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
                borderRadius: "12px", padding: "18px 20px",
                borderLeft: `3px solid ${color}`,
                opacity: entry.published ? 1 : 0.6,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 700, background: "var(--color-surface-card)", border: "1px solid var(--color-hairline-strong)", borderRadius: "5px", padding: "1px 7px" }}>
                        {entry.version}
                      </span>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, color, background: color + "15", borderRadius: "5px", padding: "1px 7px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {typeLabel}
                      </span>
                      {!entry.published && (
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-muted)", background: "var(--color-hairline)", borderRadius: "5px", padding: "1px 7px" }}>
                          비공개
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, marginBottom: "6px" }}>{entry.title}</h3>
                    <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {entry.content.length > 200 ? entry.content.slice(0, 200) + "..." : entry.content}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <button onClick={() => { setEditing(entry); setShowCreate(false); }} className="btn btn-ghost btn-sm btn-icon" title="수정">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                    </button>
                    <button onClick={() => setDeleteConfirm(entry.id)} className="btn btn-ghost btn-sm btn-icon" title="삭제" style={{ color: "var(--color-danger)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteConfirm !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "var(--color-canvas)", borderRadius: "16px", padding: "28px", maxWidth: "360px", width: "90%" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px" }}>삭제 확인</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "20px" }}>이 변경 이력을 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
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
