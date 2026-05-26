"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PlusIcon, TrashIcon, XIcon } from "@/components/icons";
import { formatDate } from "@/lib/utils";

interface Subdomain {
  id: string;
  subdomain: string;
  type: string;
  target: string;
  is_active: number;
  created_at: number;
}

const TYPE_LABELS: Record<string, string> = {
  github: "GitHub Pages",
  vercel: "Vercel",
  html: "HTML",
  redirect: "리다이렉트",
  api: "API",
};

const TYPE_TABS = [
  { key: "all", label: "전체" },
  { key: "redirect", label: "리다이렉트" },
  { key: "github", label: "GitHub" },
  { key: "vercel", label: "Vercel" },
  { key: "html", label: "HTML 배포" },
];

const RESERVED = [
  "www", "api", "mail", "app", "admin", "blog", "shop", "store",
  "dev", "staging", "prod", "beta", "alpha", "test", "demo",
  "cdn", "static", "assets", "media", "img", "images", "video",
  "docs", "help", "support", "status", "dashboard", "panel",
  "auth", "login",
];

const TYPE_PLACEHOLDERS: Record<string, string> = {
  github: "username.github.io",
  vercel: "myapp.vercel.app",
  html: "https://...",
  redirect: "https://example.com",
  api: "https://api.example.com",
};

const TYPE_HINTS: Record<string, string> = {
  github: "GitHub Pages 사이트를 서브도메인으로 연결합니다.",
  vercel: "Vercel 배포 사이트를 서브도메인으로 연결합니다.",
  html: "HTML 파일을 직접 배포합니다.",
  redirect: "다른 URL로 리다이렉트합니다.",
  api: "API 엔드포인트를 서브도메인으로 프록시합니다.",
};

function SubdomainsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") ?? "all";

  const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [subdomain, setSubdomain] = useState("");
  const [type, setType] = useState<"github" | "vercel" | "html" | "redirect" | "api">("redirect");
  const [target, setTarget] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/v1/subdomains")
      .then((r) => r.json())
      .then((d) => setSubdomains(d.subdomains ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // When switching to a type-tab, pre-select that type in the form
  useEffect(() => {
    if (tab !== "all" && Object.keys(TYPE_LABELS).includes(tab)) {
      setType(tab as typeof type);
    }
  }, [tab]);

  const filtered = tab === "all"
    ? subdomains
    : subdomains.filter((s) => s.type === tab);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/v1/subdomains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain, type, target }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "생성에 실패했습니다."); return; }
      setSubdomains((prev) => [data, ...prev]);
      setShowCreate(false);
      setSubdomain("");
      setTarget("");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/v1/subdomains/${id}`, { method: "DELETE" });
      if (res.ok) setSubdomains((prev) => prev.filter((s) => s.id !== id));
    } catch {}
    setDeleteConfirm(null);
  }

  const getTypeBadge = (t: string) => {
    const colors: Record<string, string> = {
      github: "#1f883d",
      vercel: "#000",
      html: "#e34c26",
      redirect: "var(--color-info)",
      api: "var(--color-arc)",
    };
    return (
      <span style={{
        padding: "3px 10px", borderRadius: "var(--radius-pill)", fontSize: "0.75rem", fontWeight: 600,
        background: `${colors[t] ?? "#888"}18`, color: colors[t] ?? "var(--color-muted)",
        border: `1px solid ${colors[t] ?? "#888"}33`,
      }}>
        {TYPE_LABELS[t] ?? t}
      </span>
    );
  };

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "4px" }}>서브도메인</h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>*.krl.kr 서브도메인을 관리하세요.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-pill" style={{ gap: "6px" }}>
          <PlusIcon size={16} />새 서브도메인
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid var(--color-hairline)", paddingBottom: "0" }}>
        {TYPE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => router.push(`/dashboard/subdomains${t.key === "all" ? "" : `?tab=${t.key}`}`)}
            style={{
              padding: "8px 14px", fontSize: "0.875rem", fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? "var(--color-ink)" : "var(--color-muted)",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: tab === t.key ? "2px solid var(--color-ink)" : "2px solid transparent",
              marginBottom: "-1px", fontFamily: "var(--font-sans)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        {Object.entries(TYPE_LABELS).map(([type, label]) => {
          const count = subdomains.filter((s) => s.type === type).length;
          return (
            <button key={type} onClick={() => router.push(`/dashboard/subdomains?tab=${type}`)}
              style={{
                padding: "6px 14px", borderRadius: "var(--radius-pill)", fontSize: "0.8125rem", fontWeight: 500,
                background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)",
                cursor: "pointer", color: "var(--color-ink)",
              }}>
              {label} <span style={{ marginLeft: "6px", color: "var(--color-muted)" }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Reserved warning */}
      <div style={{ padding: "14px 18px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "var(--radius-md)", marginBottom: "24px", fontSize: "0.875rem", color: "#9A3412" }}>
        <strong>예약된 서브도메인:</strong> {RESERVED.join(", ")}
      </div>

      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "64px", textAlign: "center", color: "var(--color-muted)" }}>로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "64px", textAlign: "center" }}>
            <p style={{ fontWeight: 500, marginBottom: "8px" }}>
              {tab === "all" ? "서브도메인이 없습니다" : `${TYPE_LABELS[tab] ?? tab} 서브도메인 없음`}
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "20px" }}>
              *.krl.kr 서브도메인을 등록해보세요.
            </p>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm btn-pill">
              <PlusIcon size={15} />서브도메인 추가
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>서브도메인</th>
                <th>유형</th>
                <th>대상</th>
                <th>상태</th>
                <th>등록일</th>
                <th style={{ textAlign: "right" }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <a href={`https://${s.subdomain}.krl.kr`} target="_blank" rel="noopener"
                      style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.9rem", color: "var(--color-ink)" }}>
                      {s.subdomain}.krl.kr
                    </a>
                  </td>
                  <td>{getTypeBadge(s.type)}</td>
                  <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{s.target}</span>
                  </td>
                  <td>
                    <span className={`badge ${s.is_active ? "badge-success" : "badge"}`} style={{ fontSize: "0.6875rem" }}>
                      {s.is_active ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                    {formatDate(s.created_at)}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                      <button onClick={() => setDeleteConfirm(s.id)} className="btn btn-ghost btn-sm btn-icon" style={{ color: "var(--color-danger)" }}>
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
          <div style={{ background: "var(--color-lifted)", borderRadius: "var(--radius-xl)", padding: "32px", width: "100%", maxWidth: "480px", border: "1px solid var(--color-hairline-strong)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>새 서브도메인</h2>
              <button onClick={() => setShowCreate(false)} className="btn btn-ghost btn-icon"><XIcon size={18} /></button>
            </div>
            {error && (
              <div style={{ padding: "12px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "var(--radius-sm)", marginBottom: "16px", color: "#9B1C1C", fontSize: "0.875rem" }}>
                {error}
              </div>
            )}
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>서브도메인 * (최소 4자)</label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="text" value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                    placeholder="mysite" required minLength={4} className="input"
                    style={{ borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)" }}
                  />
                  <span style={{ padding: "10px 14px", background: "var(--color-surface-card)", border: "1px solid var(--color-hairline-strong)", borderLeft: "none", borderRadius: "0 var(--radius-sm) var(--radius-sm) 0", fontSize: "0.875rem", color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                    .krl.kr
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>유형 *</label>
                <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="input">
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                {type && (
                  <p style={{ marginTop: "6px", fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                    {TYPE_HINTS[type]}
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>
                  대상 {type === "github" ? "도메인" : "URL"} *
                </label>
                <input
                  type="text" value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder={TYPE_PLACEHOLDERS[type] ?? "https://..."}
                  required className="input"
                />
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary btn-pill" style={{ flex: 1, justifyContent: "center" }}>취소</button>
                <button type="submit" disabled={creating || !subdomain || !target} className="btn btn-primary btn-pill" style={{ flex: 1, justifyContent: "center" }}>
                  {creating ? "등록 중..." : "등록하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,19,0.5)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "var(--color-lifted)", borderRadius: "var(--radius-xl)", padding: "32px", maxWidth: "400px", width: "100%", border: "1px solid var(--color-hairline-strong)" }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "12px" }}>서브도메인 삭제</h3>
            <p style={{ color: "var(--color-muted)", marginBottom: "24px" }}>이 서브도메인을 삭제하면 복구할 수 없습니다.</p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary btn-pill" style={{ flex: 1, justifyContent: "center" }}>취소</button>
              <button onClick={() => handleDelete(deleteConfirm!)} className="btn btn-pill" style={{ flex: 1, justifyContent: "center", background: "var(--color-danger)", color: "white", border: "none" }}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubdomainsPage() {
  return (
    <Suspense fallback={<div style={{ padding: "64px", textAlign: "center", color: "var(--color-muted)" }}>로딩 중...</div>}>
      <SubdomainsPageInner />
    </Suspense>
  );
}
