"use client";
import { useState, useEffect, useCallback } from "react";

interface VaultItem { id: string; type: string; name: string; username: string; encrypted_data: string; iv: string; url: string; notes: string; }

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function encryptData(key: CryptoKey, data: string): Promise<{ encrypted_data: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(data));
  return {
    encrypted_data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

async function decryptData(key: CryptoKey, encrypted_data: string, iv: string): Promise<string> {
  const enc = Uint8Array.from(atob(encrypted_data), c => c.charCodeAt(0));
  const ivBuf = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuf }, key, enc);
  return new TextDecoder().decode(decrypted);
}

const TYPE_LABELS: Record<string, string> = {
  password: "비밀번호",
  note: "메모",
  card: "카드",
  identity: "신분",
};

export default function VaultPage() {
  const [masterPassword, setMasterPassword] = useState("");
  const [masterSet, setMasterSet] = useState(false);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ type: "password", name: "", username: "", password: "", url: "", notes: "" });
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => { if (d.user) setUserId(d.user.id); });
  }, []);

  async function unlockVault() {
    if (!masterPassword || !userId) return;
    try {
      const salt = new TextEncoder().encode(userId.slice(0, 16).padEnd(16, "0"));
      const key = await deriveKey(masterPassword, salt);
      setCryptoKey(key);
      setMasterSet(true);
      loadItems();
    } catch { setError("마스터 비밀번호 처리 오류"); }
  }

  const loadItems = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/v1/vault");
    const d = await r.json();
    if (d.items) setItems(d.items);
    setLoading(false);
  }, []);

  useEffect(() => { if (masterSet) loadItems(); }, [masterSet, loadItems]);

  async function reveal(item: VaultItem) {
    if (!cryptoKey) { setError("마스터 비밀번호를 입력해주세요."); return; }
    try {
      const plain = await decryptData(cryptoKey, item.encrypted_data, item.iv);
      setRevealed(prev => ({ ...prev, [item.id]: plain }));
    } catch { setError("복호화에 실패했습니다. 마스터 비밀번호를 확인하세요."); }
  }

  async function addItem() {
    if (!cryptoKey) { setError("마스터 비밀번호가 필요합니다. 잠금 해제 후 시도하세요."); return; }
    if (!newItem.name || !newItem.password) return;
    if (adding) return;
    setAdding(true);
    const { encrypted_data, iv } = await encryptData(cryptoKey, newItem.password);
    const r = await fetch("/api/v1/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: newItem.type, name: newItem.name, username: newItem.username, encrypted_data, iv, url: newItem.url, notes: newItem.notes }),
    });
    const d = await r.json();
    if (d.item) { setItems(prev => [...prev, d.item]); setShowAdd(false); setNewItem({ type: "password", name: "", username: "", password: "", url: "", notes: "" }); }
    setAdding(false);
  }

  async function deleteItem(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/v1/vault/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
    setRevealed(prev => { const r = { ...prev }; delete r[id]; return r; });
  }

  if (!masterSet) {
    return (
      <div className="vault-page" style={{ padding: "32px", maxWidth: "480px" }}>
        <style>{`
          @media (max-width: 640px) {
            .vault-page { padding: 16px !important; }
            .vault-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px; }
            .vault-header-actions { width: 100%; justify-content: flex-start !important; }
          }
        `}</style>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>KRL Vault</h1>
        <p style={{ color: "var(--color-muted)", marginBottom: "32px" }}>비밀번호는 마스터 비밀번호로 암호화됩니다. 마스터 비밀번호는 서버에 저장되지 않습니다.</p>
        {error && <div style={{ padding: "10px 14px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "8px", marginBottom: "12px", color: "#9B1C1C", fontSize: "0.875rem" }}>{error}</div>}
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "24px" }}>
          <p style={{ fontWeight: 600, marginBottom: "12px" }}>마스터 비밀번호를 입력하세요</p>
          <input type="password" value={masterPassword} onChange={e => setMasterPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && unlockVault()} placeholder="마스터 비밀번호" style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", fontSize: "0.9375rem", background: "var(--color-surface)", color: "var(--color-ink)", marginBottom: "12px" }} />
          <button onClick={unlockVault} style={{ width: "100%", padding: "10px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>잠금 해제</button>
        </div>
      </div>
    );
  }

  return (
    <div className="vault-page" style={{ padding: "32px", maxWidth: "800px" }}>
      <style>{`
        @media (max-width: 640px) {
          .vault-page { padding: 16px !important; }
          .vault-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px; }
          .vault-header-actions { width: 100%; justify-content: flex-start !important; }
        }
      `}</style>
      <div className="vault-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "4px" }}>KRL Vault</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>클라이언트 측 AES-256 암호화</p>
        </div>
        <div className="vault-header-actions" style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => { setCryptoKey(null); setMasterSet(false); setItems([]); }} style={{ padding: "6px 12px", border: "1px solid var(--color-hairline)", borderRadius: "6px", background: "transparent", cursor: "pointer", fontSize: "0.875rem" }}>잠금</button>
          <button onClick={() => setShowAdd(true)} style={{ padding: "8px 16px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.9375rem", fontWeight: 600 }}>+ 추가</button>
        </div>
      </div>

      {error && <div style={{ padding: "10px 14px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "8px", marginBottom: "12px", color: "#9B1C1C", fontSize: "0.875rem" }}>{error}</div>}

      {showAdd && (
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <select value={newItem.type} onChange={e => setNewItem(p => ({ ...p, type: e.target.value }))} style={{ padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="이름" style={{ flex: 1, padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            </div>
            <input value={newItem.username} onChange={e => setNewItem(p => ({ ...p, username: e.target.value }))} placeholder="아이디 / 이메일" style={{ padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <input type="password" value={newItem.password} onChange={e => setNewItem(p => ({ ...p, password: e.target.value }))} placeholder="비밀번호 / 비밀 내용" style={{ padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <input value={newItem.url} onChange={e => setNewItem(p => ({ ...p, url: e.target.value }))} placeholder="URL (선택)" style={{ padding: "6px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.875rem", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={addItem} disabled={adding} style={{ padding: "8px 16px", background: "var(--color-accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", opacity: adding ? 0.7 : 1 }}>{adding ? "추가 중..." : "추가"}</button>
              <button onClick={() => setShowAdd(false)} style={{ padding: "8px 12px", border: "1px solid var(--color-hairline)", borderRadius: "8px", background: "transparent", cursor: "pointer" }}>취소</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: "var(--color-muted)" }}>로딩 중...</div> : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--color-muted)" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: "16px", opacity: 0.4 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <p>저장된 항목이 없습니다.</p>
        </div>
      ) : items.map(item => (
        <div key={item.id} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "14px 16px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--color-surface-card)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" style={{ color: "var(--color-muted)" }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
              <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>{item.name}</span>
              <span style={{ fontSize: "0.75rem", padding: "1px 6px", borderRadius: "99px", background: "var(--color-surface-card)", color: "var(--color-muted)" }}>{TYPE_LABELS[item.type] ?? item.type}</span>
            </div>
            {item.username && <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{item.username}</p>}
            {revealed[item.id] && (
              <div style={{ marginTop: "4px", padding: "4px 8px", background: "var(--color-surface)", borderRadius: "4px", fontFamily: "monospace", fontSize: "0.875rem", color: "var(--color-ink)" }}>{revealed[item.id]}</div>
            )}
          </div>
          {item.url && <a href={item.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: "0.75rem", color: "var(--color-accent)", textDecoration: "none" }}>방문</a>}
          {revealed[item.id] && (
            <button onClick={() => { navigator.clipboard.writeText(revealed[item.id]); }} style={{ padding: "4px 8px", border: "1px solid var(--color-hairline)", borderRadius: "6px", background: "transparent", cursor: "pointer", color: "var(--color-muted)", display:"flex", alignItems:"center" }} title="복사"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
          )}
          <button onClick={() => revealed[item.id] ? setRevealed(p => { const r = { ...p }; delete r[item.id]; return r; }) : reveal(item)} style={{ padding: "4px 10px", border: "1px solid var(--color-hairline)", borderRadius: "6px", background: "transparent", cursor: "pointer", fontSize: "0.8125rem", color: "var(--color-body)" }}>
            {revealed[item.id] ? "숨기기" : "보기"}
          </button>
          <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "4px" }}>✕</button>
        </div>
      ))}
    </div>
  );
}
