"use client";
import { useState, useEffect } from "react";

interface Workspace {
  id: string;
  name: string;
  description?: string;
  github_url?: string;
  dir_path: string;
  disk_bytes: number;
  created_at: number;
  updated_at: number;
  last_active_at?: number;
  status: string;
}

interface PlanInfo {
  plan: string;
  limits: { max_workspaces: number; disk_per_workspace: number };
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function relTime(ts: number) {
  const d = Date.now() - ts;
  if (d < 60000) return "방금";
  if (d < 3600000) return `${Math.floor(d / 60000)}분 전`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}시간 전`;
  return new Date(ts).toLocaleDateString("ko-KR");
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)",
  borderRadius: 8, fontSize: ".875rem", background: "var(--color-canvas)",
  color: "var(--color-ink)", boxSizing: "border-box",
};

export default function CloudIDEPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", github_url: "" });
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState<{ has_key: boolean; masked?: string } | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keySaving, setKeySaving] = useState(false);
  const [cloneId, setCloneId] = useState<string | null>(null);
  const [cloneUrl, setCloneUrl] = useState("");
  const [cloning, setCloning] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    load();
    fetch("/api/v1/workspace/anthropic-key").then(r => r.json()).then(setApiKey);
  }, []);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/v1/workspace");
    const d = await r.json();
    setWorkspaces(d.workspaces ?? []);
    setPlanInfo({ plan: d.plan, limits: d.limits });
    setLoading(false);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr("");
    const r = await fetch("/api/v1/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    if (d.error) { setErr(d.error); setSaving(false); return; }
    setWorkspaces(prev => [d.workspace, ...prev]);
    setCreating(false);
    setForm({ name: "", description: "", github_url: "" });
    setSaving(false);
  }

  async function deleteWs(id: string) {
    if (!confirm("워크스페이스를 삭제하시겠습니까? 모든 파일이 영구 삭제됩니다.")) return;
    await fetch(`/api/v1/workspace/${id}`, { method: "DELETE" });
    setWorkspaces(prev => prev.filter(w => w.id !== id));
  }

  async function saveKey(e: React.FormEvent) {
    e.preventDefault();
    setKeySaving(true); setErr("");
    const r = await fetch("/api/v1/workspace/anthropic-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: keyInput }),
    });
    const d = await r.json();
    if (d.error) { setErr(d.error); setKeySaving(false); return; }
    setApiKey({ has_key: true, masked: keyInput.slice(0, 10) + "..." + keyInput.slice(-4) });
    setShowKeyModal(false);
    setKeyInput("");
    setKeySaving(false);
  }

  async function deleteKey() {
    if (!confirm("API 키를 삭제하시겠습니까?")) return;
    await fetch("/api/v1/workspace/anthropic-key", { method: "DELETE" });
    setApiKey({ has_key: false });
  }

  async function cloneRepo(e: React.FormEvent) {
    e.preventDefault();
    if (!cloneId) return;
    setCloning(true); setErr("");
    const r = await fetch(`/api/v1/workspace/${cloneId}/clone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ github_url: cloneUrl }),
    });
    const d = await r.json();
    if (d.error) { setErr(d.error); setCloning(false); return; }
    setCloneId(null); setCloneUrl(""); setCloning(false);
    load();
  }

  const planLabel: Record<string, string> = { free: "무료", pro: "Pro", vip: "VIP" };
  const plan = planInfo?.plan ?? "free";

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>KRL Cloud IDE</h1>
          <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>브라우저에서 Claude Code 실행 · 워크스페이스 관리</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setShowKeyModal(true)}
            style={{ padding: "7px 14px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: ".8125rem", display: "flex", alignItems: "center", gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            {apiKey?.has_key ? `API 키: ${apiKey.masked}` : "API 키 설정"}
          </button>
          {planInfo && (
            <span style={{ padding: "4px 10px", background: plan === "vip" ? "#7c3aed" : plan === "pro" ? "#2563eb" : "#64748b", color: "#fff", borderRadius: 99, fontSize: ".75rem", fontWeight: 700 }}>
              {planLabel[plan] ?? plan} · {planInfo.limits.max_workspaces}개 워크스페이스
            </span>
          )}
          <button
            onClick={() => setCreating(true)}
            style={{ padding: "8px 18px", background: "var(--color-ink)", color: "var(--color-canvas)", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".875rem" }}
          >
            새 워크스페이스
          </button>
        </div>
      </div>

      {/* Plan info banner */}
      <div style={{ background: "var(--color-canvas)", border: "1px solid var(--color-hairline)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap" }}>
        {[
          ["무료", "워크스페이스 1개 · 세션 30분 · 512MB"],
          ["Pro", "워크스페이스 5개 · 무제한 세션 · 5GB"],
          ["VIP", "워크스페이스 20개 · 무제한 세션 · 20GB"],
        ].map(([p, desc]) => (
          <div key={p} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: p === "VIP" ? "#7c3aed" : p === "Pro" ? "#2563eb" : "#94a3b8", display: "inline-block" }} />
            <span style={{ fontSize: ".8125rem" }}><strong>{p}</strong> — {desc}</span>
          </div>
        ))}
        <span style={{ fontSize: ".8125rem", color: "var(--color-muted)", marginLeft: "auto" }}>저장 공간은 통합 스토리지에서 차감됩니다.</span>
      </div>

      {err && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: ".875rem" }}>{err}</div>
      )}

      {/* Workspace list */}
      {loading ? (
        <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>불러오는 중...</p>
      ) : workspaces.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, border: "2px dashed var(--color-hairline)", borderRadius: 12 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
            <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
          </svg>
          <p style={{ color: "var(--color-muted)", marginBottom: 4 }}>워크스페이스가 없습니다.</p>
          <p style={{ color: "var(--color-muted)", fontSize: ".8125rem" }}>새 워크스페이스를 만들거나 GitHub 저장소를 가져오세요.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 14 }}>
          {workspaces.map(w => (
            <div key={w.id} style={{ background: "var(--color-canvas)", border: "1px solid var(--color-hairline)", borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 2 }}>{w.name}</p>
                  {w.description && <p style={{ fontSize: ".8125rem", color: "var(--color-muted)" }}>{w.description}</p>}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => { setCloneId(w.id); setCloneUrl(w.github_url ?? ""); }} style={{ padding: "4px 8px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: ".75rem" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                  </button>
                  <button onClick={() => deleteWs(w.id)} style={{ padding: "4px 8px", border: "1px solid #fecdd3", borderRadius: 6, background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: ".75rem" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  </button>
                </div>
              </div>

              {w.github_url && (
                <a href={w.github_url} target="_blank" rel="noopener" style={{ fontSize: ".75rem", color: "var(--color-muted)", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  {w.github_url.replace("https://github.com/", "")}
                </a>
              )}

              <div style={{ display: "flex", gap: 12, fontSize: ".75rem", color: "var(--color-muted)" }}>
                <span>{fmtBytes(Number(w.disk_bytes))}</span>
                <span>·</span>
                <span>최근 활동: {w.last_active_at ? relTime(Number(w.last_active_at)) : "없음"}</span>
              </div>

              <a
                href={`/workspace/${w.id}`}
                style={{ display: "block", padding: "9px", background: "var(--color-ink)", color: "var(--color-canvas)", borderRadius: 8, textAlign: "center", textDecoration: "none", fontWeight: 600, fontSize: ".875rem", marginTop: 4 }}
              >
                터미널 열기
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={e => e.target === e.currentTarget && setCreating(false)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ fontWeight: 700, marginBottom: 18 }}>새 워크스페이스</h2>
            <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>이름 *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="my-project" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>설명</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="간단한 설명 (선택)" style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button type="button" onClick={() => setCreating(false)} style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer" }}>취소</button>
                <button type="submit" disabled={saving} style={{ padding: "8px 20px", background: "var(--color-ink)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "생성 중..." : "생성"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* API Key modal */}
      {showKeyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={e => e.target === e.currentTarget && setShowKeyModal(false)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Anthropic API 키</h2>
            <p style={{ color: "var(--color-muted)", fontSize: ".875rem", marginBottom: 18 }}>Claude Code 실행에 사용됩니다. 키는 서버에 암호화 없이 저장되므로 신뢰할 수 있는 환경에서만 사용하세요.</p>
            {apiKey?.has_key ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: ".875rem", color: "#166534" }}>
                  현재 키: {apiKey.masked}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={deleteKey} style={{ padding: "8px 16px", border: "1px solid #fecdd3", borderRadius: 8, background: "transparent", color: "#dc2626", cursor: "pointer" }}>키 삭제</button>
                  <button onClick={() => setShowKeyModal(false)} style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer" }}>닫기</button>
                </div>
              </div>
            ) : (
              <form onSubmit={saveKey} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input value={keyInput} onChange={e => setKeyInput(e.target.value)} required placeholder="sk-ant-api03-..." type="password" style={inputStyle} />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setShowKeyModal(false)} style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer" }}>취소</button>
                  <button type="submit" disabled={keySaving} style={{ padding: "8px 20px", background: "var(--color-ink)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{keySaving ? "저장 중..." : "저장"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* GitHub clone modal */}
      {cloneId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={e => e.target === e.currentTarget && setCloneId(null)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ fontWeight: 700, marginBottom: 8 }}>GitHub 저장소 클론</h2>
            <p style={{ color: "var(--color-muted)", fontSize: ".875rem", marginBottom: 18 }}>빈 워크스페이스에만 클론 가능합니다. (depth=1)</p>
            <form onSubmit={cloneRepo} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input value={cloneUrl} onChange={e => setCloneUrl(e.target.value)} required placeholder="https://github.com/owner/repo" style={inputStyle} />
              {err && <p style={{ color: "#dc2626", fontSize: ".8125rem" }}>{err}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => { setCloneId(null); setErr(""); }} style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer" }}>취소</button>
                <button type="submit" disabled={cloning} style={{ padding: "8px 20px", background: "var(--color-ink)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{cloning ? "클론 중..." : "클론"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
