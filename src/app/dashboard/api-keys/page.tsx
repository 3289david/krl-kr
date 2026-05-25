"use client";
import { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, CopyIcon, CheckIcon, XIcon, KeyIcon } from "@/components/icons";
import { formatDate } from "@/lib/utils";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: number | null;
  expires_at: number | null;
  created_at: number;
}

const ALL_SCOPES = [
  { value: "links:read", label: "링크 조회" },
  { value: "links:write", label: "링크 생성/수정/삭제" },
  { value: "analytics:read", label: "분석 조회" },
  { value: "files:read", label: "파일 조회/다운로드" },
  { value: "files:write", label: "파일 업로드/삭제" },
  { value: "paste:read", label: "페이스트 조회" },
  { value: "paste:write", label: "페이스트 생성/삭제" },
  { value: "qr:generate", label: "QR 생성" },
  { value: "bio:read", label: "Bio 페이지 조회" },
  { value: "bio:write", label: "Bio 페이지 수정" },
  { value: "webhook:read", label: "웹훅 조회" },
  { value: "webhook:write", label: "웹훅 생성/삭제" },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["links:read", "links:write"]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/keys")
      .then((r) => r.json())
      .then((d) => setKeys(d.keys ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName, scopes: selectedScopes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "생성에 실패했습니다."); return; }
      setNewKey(data.key);
      setKeys((prev) => [{
        id: data.id, name: data.name, key_prefix: data.key_prefix,
        scopes: data.scopes, last_used_at: null, expires_at: data.expires_at,
        created_at: Date.now(),
      }, ...prev]);
      setShowCreate(false);
      setKeyName("");
      setSelectedScopes(["links:read", "links:write"]);
    } catch { setError("네트워크 오류가 발생했습니다."); }
    finally { setCreating(false); }
  }

  async function handleCopyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  async function handleRevoke(id: string) {
    try {
      const res = await fetch(`/api/v1/keys/${id}`, { method: "DELETE" });
      if (res.ok) setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {}
    setDeleteConfirm(null);
  }

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "4px" }}>API 키</h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>자동화 및 외부 통합을 위한 API 키를 관리하세요.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-pill" style={{ gap: "6px" }}>
          <PlusIcon size={16} />새 API 키
        </button>
      </div>

      {/* Newly created key */}
      {newKey && (
        <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "var(--radius-xl)", padding: "20px 24px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <p style={{ fontWeight: 600, color: "#065F46" }}>새 API 키가 생성되었습니다</p>
            <button onClick={() => setNewKey(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#065F46" }}>
              <XIcon size={16} />
            </button>
          </div>
          <p style={{ fontSize: "0.8125rem", color: "#065F46", marginBottom: "12px" }}>
            이 키는 지금 한 번만 표시됩니다. 안전한 곳에 보관하세요.
          </p>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "0.875rem", padding: "10px 14px", background: "white", border: "1px solid #A7F3D0", borderRadius: "var(--radius-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {newKey}
            </div>
            <button onClick={handleCopyKey} className="btn btn-sm btn-pill" style={{ background: "#065F46", color: "white", border: "none", gap: "6px", flexShrink: 0 }}>
              {copiedKey ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              {copiedKey ? "복사됨" : "복사"}
            </button>
          </div>
        </div>
      )}

      {/* Keys table */}
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "64px", textAlign: "center", color: "var(--color-muted)" }}>로딩 중...</div>
        ) : keys.length === 0 ? (
          <div style={{ padding: "64px", textAlign: "center" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--color-surface-card)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--color-muted)" }}>
              <KeyIcon size={22} />
            </div>
            <p style={{ fontWeight: 500, marginBottom: "8px" }}>API 키가 없습니다</p>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "20px" }}>API 키를 생성하여 자동화를 시작하세요.</p>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm btn-pill">
              <PlusIcon size={15} />API 키 만들기
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>키 접두사</th>
                <th>권한</th>
                <th>마지막 사용</th>
                <th>생성일</th>
                <th style={{ textAlign: "right" }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id}>
                  <td style={{ fontWeight: 600 }}>{key.name}</td>
                  <td>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--color-muted)" }}>
                      {key.key_prefix}••••••••
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {key.scopes.slice(0, 3).map((s) => (
                        <span key={s} className="badge" style={{ fontSize: "0.6875rem" }}>{s}</span>
                      ))}
                      {key.scopes.length > 3 && (
                        <span className="badge" style={{ fontSize: "0.6875rem" }}>+{key.scopes.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                    {key.last_used_at ? formatDate(key.last_used_at) : "사용 안 함"}
                  </td>
                  <td style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                    {formatDate(key.created_at)}
                  </td>
                  <td>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button onClick={() => setDeleteConfirm(key.id)} className="btn btn-ghost btn-sm btn-icon" style={{ color: "var(--color-danger)" }} title="폐기">
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,19,0.5)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={{ background: "var(--color-lifted)", borderRadius: "var(--radius-xl)", padding: "32px", width: "100%", maxWidth: "520px", border: "1px solid var(--color-hairline-strong)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>새 API 키</h2>
              <button onClick={() => setShowCreate(false)} className="btn btn-ghost btn-icon"><XIcon size={18} /></button>
            </div>
            {error && <div style={{ padding: "12px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "var(--radius-sm)", marginBottom: "16px", color: "#9B1C1C", fontSize: "0.875rem" }}>{error}</div>}
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>키 이름 *</label>
                <input type="text" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="예: 프로덕션 서버" required className="input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "12px" }}>권한 *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {ALL_SCOPES.map((scope) => (
                    <label key={scope.value} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.875rem", color: "var(--color-body)", fontWeight: 400 }}>
                      <input type="checkbox" checked={selectedScopes.includes(scope.value)} onChange={() => toggleScope(scope.value)} style={{ width: "auto", cursor: "pointer" }} />
                      {scope.label}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary btn-pill" style={{ flex: 1, justifyContent: "center" }}>취소</button>
                <button type="submit" disabled={creating || !keyName || selectedScopes.length === 0} className="btn btn-primary btn-pill" style={{ flex: 1, justifyContent: "center" }}>
                  {creating ? "생성 중..." : "API 키 생성"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,19,0.5)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "var(--color-lifted)", borderRadius: "var(--radius-xl)", padding: "32px", maxWidth: "400px", width: "100%", border: "1px solid var(--color-hairline-strong)" }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "12px" }}>API 키 폐기</h3>
            <p style={{ color: "var(--color-muted)", marginBottom: "24px" }}>이 API 키를 폐기하면 해당 키를 사용하는 모든 통합이 작동을 멈춥니다.</p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary btn-pill" style={{ flex: 1, justifyContent: "center" }}>취소</button>
              <button onClick={() => handleRevoke(deleteConfirm)} className="btn btn-pill" style={{ flex: 1, justifyContent: "center", background: "var(--color-danger)", color: "white", border: "none" }}>폐기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
