"use client";
import { useState, useEffect } from "react";

interface Store { id: string; name: string; description?: string; api_key: string; is_public: number; entry_count: number; created_at: number; }
interface Entry { key: string; value: string; type: string; expires_at?: number; updated_at: number; }

function relTime(ts: number) { const n = Number(ts); const d = Date.now()-n; if(d<60000) return "방금"; if(d<3600000) return `${Math.floor(d/60000)}분 전`; return new Date(n).toLocaleDateString("ko-KR"); }
const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".875rem", background: "var(--color-canvas)", color: "var(--color-ink)", boxSizing: "border-box" as const };

export default function EdgedbDashboard() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", is_public: false });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Store | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [keyInput, setKeyInput] = useState("");
  const [valInput, setValInput] = useState("");
  const [ttlInput, setTtlInput] = useState("");
  const [setting, setSetting] = useState(false);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch("/api/v1/edgedb").then(r => r.json()).then(d => { setStores(d.stores ?? []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/v1/edgedb/${selected.id}`).then(r => r.json()).then(d => setEntries(d.entries ?? []));
  }, [selected]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const r = await fetch("/api/v1/edgedb", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await r.json();
    if (d.store) { setStores(prev => [d.store, ...prev]); setCreating(false); setForm({ name: "", description: "", is_public: false }); }
    setSaving(false);
  }

  async function del(id: string) {
    if (!confirm("스토어와 모든 데이터를 삭제하시겠습니까?")) return;
    await fetch(`/api/v1/edgedb/${id}`, { method: "DELETE" });
    setStores(prev => prev.filter(s => s.id !== id));
    if (selected?.id === id) { setSelected(null); setEntries([]); }
  }

  async function setKey(e: React.FormEvent) {
    e.preventDefault(); if (!selected || !keyInput) return;
    setSetting(true);
    let value: unknown = valInput;
    try { value = JSON.parse(valInput); } catch { /* keep string */ }
    const body: Record<string, unknown> = { value };
    if (ttlInput) body.ttl = Number(ttlInput);
    const r = await fetch(`/api/edgedb/${selected.id}/${encodeURIComponent(keyInput)}?apikey=${selected.api_key}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) {
      setKeyInput(""); setValInput(""); setTtlInput("");
      const r2 = await fetch(`/api/v1/edgedb/${selected.id}`);
      const d = await r2.json(); setEntries(d.entries ?? []);
    }
    setSetting(false);
  }

  async function deleteKey(key: string) {
    if (!selected) return;
    await fetch(`/api/edgedb/${selected.id}/${encodeURIComponent(key)}?apikey=${selected.api_key}`, { method: "DELETE" });
    setEntries(prev => prev.filter(e => e.key !== key));
  }

  function copy(text: string, id: string) { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(""), 2000); }

  const sdkSnippet = selected ? `// JavaScript / TypeScript
const KRL_STORE_ID = "${selected.id}";
const KRL_API_KEY = "${selected.api_key}";
const BASE = "https://krl.kr/api/edgedb";

const krl = {
  async set(key, value, ttl) {
    return fetch(\`\${BASE}/\${KRL_STORE_ID}/\${key}?apikey=\${KRL_API_KEY}\`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value, ttl }),
    });
  },
  async get(key) {
    const r = await fetch(\`\${BASE}/\${KRL_STORE_ID}/\${key}?apikey=\${KRL_API_KEY}\`);
    if (!r.ok) return null;
    const d = await r.json();
    return d.value;
  },
  async del(key) {
    return fetch(\`\${BASE}/\${KRL_STORE_ID}/\${key}?apikey=\${KRL_API_KEY}\`, { method: "DELETE" });
  },
};

// 예시
await krl.set("user:123", { name: "김민준", plan: "pro" });
const user = await krl.get("user:123");` : "";

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 2 }}>KRL EdgeDB</h1>
          <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>글로벌 엣지 키-값 스토어</p>
        </div>
        <button onClick={() => setCreating(true)} style={{ padding: "8px 18px", background: "var(--color-ink)", color: "var(--color-canvas)", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".875rem" }}>새 스토어</button>
      </div>

      {creating && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={e => e.target === e.currentTarget && setCreating(false)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ fontWeight: 700, marginBottom: 18 }}>새 스토어 만들기</h2>
            <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>이름 *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="내 캐시 스토어" style={inputStyle} /></div>
              <div><label style={{ fontSize: ".8125rem", fontWeight: 600, display: "block", marginBottom: 4 }}>설명</label><input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={inputStyle} /></div>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: ".875rem", cursor: "pointer" }}>
                <input type="checkbox" checked={form.is_public} onChange={e => setForm(p => ({ ...p, is_public: e.target.checked }))} />
                공개 (API 키 없이 읽기 가능)
              </label>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setCreating(false)} style={{ padding: "8px 16px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", cursor: "pointer" }}>취소</button>
                <button type="submit" disabled={saving} style={{ padding: "8px 20px", background: "var(--color-ink)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{saving ? "생성 중..." : "생성"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>불러오는 중...</p> : stores.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", border: "2px dashed var(--color-hairline)", borderRadius: 12 }}>
              <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>스토어가 없습니다</p>
            </div>
          ) : stores.map(s => (
            <div key={s.id} onClick={() => setSelected(s)} style={{ padding: "12px 14px", border: `2px solid ${selected?.id === s.id ? "var(--color-ink)" : "var(--color-hairline)"}`, borderRadius: 10, cursor: "pointer", background: "#fff" }}>
              <div style={{ fontWeight: 600, fontSize: ".9375rem", marginBottom: 4 }}>{s.name}</div>
              <div style={{ display: "flex", gap: 8, fontSize: ".75rem", color: "var(--color-muted)" }}>
                <span>{Number(s.entry_count)}개 키</span>
                {s.is_public ? <span style={{ color: "#16a34a" }}>공개</span> : <span>비공개</span>}
              </div>
            </div>
          ))}
        </div>

        {selected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <h2 style={{ fontWeight: 700, flex: 1 }}>{selected.name}</h2>
                <button onClick={() => del(selected.id)} style={{ padding: "5px 12px", border: "1px solid #fecdd3", borderRadius: 8, background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: ".8125rem" }}>삭제</button>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", background: "var(--color-canvas)", borderRadius: 8, padding: "8px 12px" }}>
                <code style={{ flex: 1, fontSize: ".8125rem", fontFamily: "monospace", wordBreak: "break-all" }}>{showKey === "apikey" ? selected.api_key : selected.api_key.slice(0, 12) + "••••••••"}</code>
                <button onClick={() => setShowKey(showKey === "apikey" ? null : "apikey")} style={{ padding: "3px 8px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: ".75rem" }}>{showKey === "apikey" ? "숨기기" : "보기"}</button>
                <button onClick={() => copy(selected.api_key, "api")} style={{ padding: "3px 8px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: ".75rem" }}>{copied === "api" ? "복사됨" : "복사"}</button>
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 14, padding: 20 }}>
              <h3 style={{ fontWeight: 600, marginBottom: 12 }}>키 설정</h3>
              <form onSubmit={setKey} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px auto", gap: 8, alignItems: "end" }}>
                <div><label style={{ fontSize: ".75rem", color: "var(--color-muted)", display: "block", marginBottom: 3 }}>키</label><input value={keyInput} onChange={e => setKeyInput(e.target.value)} required placeholder="user:123" style={inputStyle} /></div>
                <div><label style={{ fontSize: ".75rem", color: "var(--color-muted)", display: "block", marginBottom: 3 }}>값 (JSON 또는 문자열)</label><input value={valInput} onChange={e => setValInput(e.target.value)} required placeholder={`{"name":"김민준"}`} style={inputStyle} /></div>
                <div><label style={{ fontSize: ".75rem", color: "var(--color-muted)", display: "block", marginBottom: 3 }}>TTL(초)</label><input type="number" value={ttlInput} onChange={e => setTtlInput(e.target.value)} placeholder="영구" style={inputStyle} /></div>
                <button type="submit" disabled={setting} style={{ padding: "8px 16px", background: "var(--color-ink)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".875rem" }}>{setting ? "저장 중..." : "저장"}</button>
              </form>
            </div>

            {entries.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 14, padding: 20 }}>
                <h3 style={{ fontWeight: 600, marginBottom: 12 }}>저장된 키 ({entries.length})</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {entries.map(e => (
                    <div key={e.key} style={{ display: "grid", gridTemplateColumns: "180px 1fr auto auto", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--color-hairline)" }}>
                      <code style={{ fontSize: ".8125rem", fontFamily: "monospace", color: "var(--color-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.key}</code>
                      <code style={{ fontSize: ".8125rem", fontFamily: "monospace", color: "var(--color-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(e.value).slice(0, 80)}{String(e.value).length > 80 ? "..." : ""}</code>
                      <span style={{ fontSize: ".75rem", color: "var(--color-muted)", whiteSpace: "nowrap" }}>{relTime(e.updated_at)}</span>
                      <button onClick={() => deleteKey(e.key)} style={{ padding: "3px 8px", border: "1px solid #fecdd3", borderRadius: 6, background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: ".75rem" }}>삭제</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <h3 style={{ fontWeight: 600, margin: 0 }}>SDK 코드</h3>
                <button onClick={() => copy(sdkSnippet, "sdk")} style={{ padding: "4px 12px", border: "1px solid var(--color-hairline)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: ".8125rem" }}>{copied === "sdk" ? "복사됨" : "복사"}</button>
              </div>
              <pre style={{ background: "var(--color-canvas)", borderRadius: 8, padding: 16, fontSize: ".8125rem", fontFamily: "monospace", lineHeight: 1.6, overflow: "auto", margin: 0, color: "var(--color-ink)" }}>{sdkSnippet}</pre>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, border: "2px dashed var(--color-hairline)", borderRadius: 14 }}>
            <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>왼쪽에서 스토어를 선택하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
