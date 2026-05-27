"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  PlusIcon, SearchIcon, CopyIcon, CheckIcon, TrashIcon,
  EditIcon, BarChartIcon, ExternalLinkIcon, QrCodeIcon, XIcon
} from "@/components/icons";
import { formatNumber, formatRelativeTime, formatDate, truncate, buildShortUrl, isValidUrl, normalizeUrl } from "@/lib/utils";

interface LinkData {
  id: string;
  slug: string;
  original_url: string;
  title: string | null;
  click_count: number;
  unique_count: number;
  created_at: number;
  expires_at: number | null;
  max_clicks: number | null;
  is_active: number;
  is_dynamic: number;
  ios_url: string | null;
  android_url: string | null;
  password_hash: string | null;
}

const TABS = [
  { key: "all", label: "전체 링크" },
  { key: "dynamic", label: "다이나믹" },
  { key: "temp", label: "임시 링크" },
  { key: "app", label: "앱 링크" },
];

function CreateLinkModal({ tab, onClose, onCreated }: { tab: string; onClose: () => void; onCreated: (link: LinkData) => void }) {
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [isDynamic, setIsDynamic] = useState(tab === "dynamic");
  const [expiresIn, setExpiresIn] = useState("");
  const [maxClicks, setMaxClicks] = useState("");
  const [iosUrl, setIosUrl] = useState("");
  const [androidUrl, setAndroidUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const normalized = normalizeUrl(url);
    if (!isValidUrl(normalized)) {
      setError("유효한 URL을 입력해주세요.");
      setLoading(false);
      return;
    }

    const body: Record<string, unknown> = { url: normalized };
    if (slug) body.slug = slug;
    if (title) body.title = title;
    if (isDynamic) body.is_dynamic = true;
    if (tab === "temp") {
      if (expiresIn) body.expires_at = new Date(Date.now() + parseInt(expiresIn) * 60 * 60 * 1000).toISOString();
      if (maxClicks) body.max_clicks = parseInt(maxClicks);
    }
    if (tab === "app") {
      if (iosUrl) body.ios_url = iosUrl;
      if (androidUrl) body.android_url = androidUrl;
    }

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "링크 생성에 실패했습니다.");
        return;
      }
      onCreated(data.link);
      onClose();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const modalTitle = tab === "dynamic" ? "다이나믹 링크 만들기" : tab === "temp" ? "임시 링크 만들기" : tab === "app" ? "앱 링크 만들기" : "새 링크 만들기";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(20,20,19,0.5)",
      backdropFilter: "blur(4px)", zIndex: 100, display: "flex",
      alignItems: "center", justifyContent: "center", padding: "24px",
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--color-lifted)", borderRadius: "var(--radius-xl)",
        padding: "32px", width: "100%", maxWidth: "480px",
        border: "1px solid var(--color-hairline-strong)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>{modalTitle}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <XIcon size={18} />
          </button>
        </div>

        {error && (
          <div style={{ padding: "12px 14px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "var(--radius-sm)", marginBottom: "16px", color: "#9B1C1C", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>URL *</label>
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} onBlur={(e) => { if (e.target.value.trim()) setUrl(normalizeUrl(e.target.value)); }} placeholder="example.com/..." required className="input" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>커스텀 슬러그 (선택)</label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ padding: "10px 12px", background: "var(--color-surface-card)", border: "1px solid var(--color-hairline-strong)", borderRight: "none", borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)", fontSize: "0.875rem", color: "var(--color-muted)" }}>krl.kr/</span>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-link" className="input" style={{ borderRadius: "0 var(--radius-sm) var(--radius-sm) 0" }} />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>제목 (선택)</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="링크 제목" className="input" />
          </div>

          {tab === "all" && (
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
              <input type="checkbox" checked={isDynamic} onChange={(e) => setIsDynamic(e.target.checked)} style={{ width: "16px", height: "16px" }} />
              <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>다이나믹 링크 (QR 유지하며 목적지 변경 가능)</span>
            </label>
          )}

          {tab === "dynamic" && (
            <div style={{ padding: "12px 14px", background: "var(--color-surface-card)", borderRadius: "var(--radius-sm)", fontSize: "0.8125rem", color: "var(--color-muted)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              QR 코드를 유지하면서 목적지 URL을 나중에 수정할 수 있습니다.
            </div>
          )}

          {tab === "temp" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>만료 시간 (시간)</label>
                <input type="number" value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)} placeholder="예: 24 (24시간 후 만료)" min="1" className="input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>최대 클릭 수</label>
                <input type="number" value={maxClicks} onChange={(e) => setMaxClicks(e.target.value)} placeholder="예: 100 (100번 클릭 후 만료)" min="1" className="input" />
              </div>
            </>
          )}

          {tab === "app" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>iOS URL</label>
                <input type="text" value={iosUrl} onChange={(e) => setIosUrl(e.target.value)} placeholder="https://apps.apple.com/..." className="input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>Android URL</label>
                <input type="text" value={androidUrl} onChange={(e) => setAndroidUrl(e.target.value)} placeholder="https://play.google.com/..." className="input" />
              </div>
              <div style={{ padding: "12px 14px", background: "var(--color-surface-card)", borderRadius: "var(--radius-sm)", fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                iOS/Android 각각 다른 주소로 이동합니다. 위 URL을 입력하세요.
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-pill" style={{ flex: 1, justifyContent: "center" }}>취소</button>
            <button type="submit" disabled={loading || !url} className="btn btn-primary btn-pill" style={{ flex: 1, justifyContent: "center" }}>
              {loading ? "생성 중..." : "링크 만들기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditLinkModal({ link, onClose, onUpdated }: { link: LinkData; onClose: () => void; onUpdated: (link: LinkData) => void }) {
  const [url, setUrl] = useState(link.original_url);
  const [title, setTitle] = useState(link.title ?? "");
  const [active, setActive] = useState(!!link.is_active);
  const [iosUrl, setIosUrl] = useState(link.ios_url ?? "");
  const [androidUrl, setAndroidUrl] = useState(link.android_url ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const normalized = normalizeUrl(url);
    if (!isValidUrl(normalized)) {
      setError("유효한 URL을 입력해주세요.");
      setLoading(false);
      return;
    }
    try {
      const body: Record<string, unknown> = { url: normalized, title: title || null, is_active: active };
      if (link.ios_url !== null || iosUrl) body.ios_url = iosUrl || null;
      if (link.android_url !== null || androidUrl) body.android_url = androidUrl || null;

      const res = await fetch(`/api/v1/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "수정에 실패했습니다."); return; }
      onUpdated({ ...link, original_url: normalized, title: title || null, is_active: active ? 1 : 0, ios_url: iosUrl || null, android_url: androidUrl || null });
      onClose();
    } catch { setError("네트워크 오류가 발생했습니다."); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,19,0.5)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--color-lifted)", borderRadius: "var(--radius-xl)", padding: "32px", width: "100%", maxWidth: "480px", border: "1px solid var(--color-hairline-strong)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>링크 수정</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><XIcon size={18} /></button>
        </div>
        {error && (
          <div style={{ padding: "12px 14px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "var(--radius-sm)", marginBottom: "16px", color: "#9B1C1C", fontSize: "0.875rem" }}>{error}</div>
        )}
        <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>슬러그</label>
            <div style={{ padding: "10px 12px", background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-sm)", fontSize: "0.875rem", color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}>
              krl.kr/{link.slug}
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>URL *</label>
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} onBlur={(e) => { if (e.target.value.trim()) setUrl(normalizeUrl(e.target.value)); }} placeholder="example.com/..." required className="input" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>제목 (선택)</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="링크 제목" className="input" />
          </div>
          {(link.ios_url !== null || link.android_url !== null) && (
            <>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>iOS URL</label>
                <input type="text" value={iosUrl} onChange={(e) => setIosUrl(e.target.value)} placeholder="https://apps.apple.com/..." className="input" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>Android URL</label>
                <input type="text" value={androidUrl} onChange={(e) => setAndroidUrl(e.target.value)} placeholder="https://play.google.com/..." className="input" />
              </div>
            </>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ width: "16px", height: "16px" }} />
            <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>활성화</span>
          </label>
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-pill" style={{ flex: 1, justifyContent: "center" }}>취소</button>
            <button type="submit" disabled={loading || !url} className="btn btn-primary btn-pill" style={{ flex: 1, justifyContent: "center" }}>
              {loading ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LinksPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") ?? "all";

  const [links, setLinks] = useState<LinkData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchLinks = useCallback(async (p = 1, q = "", currentTab = tab) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p.toString(), limit: "20" });
      if (q) params.set("q", q);
      if (currentTab === "dynamic") params.set("is_dynamic", "1");
      if (currentTab === "temp") params.set("has_expiry", "1");
      if (currentTab === "app") params.set("has_app", "1");
      const res = await fetch(`/api/v1/links?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links ?? []);
        setTotal(data.total ?? 0);
        setPages(Math.ceil((data.total ?? 0) / 20));
        setPage(p);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { fetchLinks(1, search, tab); }, [fetchLinks, tab]);

  async function handleCopy(slug: string) {
    await navigator.clipboard.writeText(buildShortUrl(slug));
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/v1/links/${id}`, { method: "DELETE" });
      if (res.ok) { setLinks((prev) => prev.filter((l) => l.id !== id)); setTotal((t) => t - 1); }
    } catch { /* ignore */ }
    setDeleteConfirm(null);
  }

  const TAB_LABELS: Record<string, string> = { all: "전체 링크", dynamic: "다이나믹 링크", temp: "임시 링크", app: "앱 링크" };
  const TAB_DESCS: Record<string, string> = {
    all: "모든 링크",
    dynamic: "QR 코드를 유지하면서 목적지를 변경할 수 있는 링크",
    temp: "시간 또는 클릭 수 제한이 있는 임시 링크",
    app: "iOS와 Android에 각각 다른 URL을 지정하는 링크",
  };

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "4px" }}>{TAB_LABELS[tab] ?? "링크 관리"}</h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>{TAB_DESCS[tab] ?? ""}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-pill" style={{ gap: "6px" }}>
          <PlusIcon size={16} />새 링크
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid var(--color-hairline)", paddingBottom: "0" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => router.push(`/dashboard/links${t.key === "all" ? "" : `?tab=${t.key}`}`)}
            style={{
              padding: "8px 14px", fontSize: "0.875rem", fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? "var(--color-ink)" : "var(--color-muted)",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: tab === t.key ? "2px solid var(--color-ink)" : "2px solid transparent",
              marginBottom: "-1px", fontFamily: "var(--font-sans)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "20px", maxWidth: "400px" }}>
        <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }}>
          <SearchIcon size={16} />
        </div>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="URL, 슬러그, 제목으로 검색..." className="input" style={{ paddingLeft: "40px" }} />
      </div>

      {/* Table */}
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "64px", textAlign: "center", color: "var(--color-muted)" }}>로딩 중...</div>
        ) : links.length === 0 ? (
          <div style={{ padding: "64px", textAlign: "center" }}>
            <p style={{ fontWeight: 500, marginBottom: "8px" }}>
              {tab === "all" ? "링크가 없습니다" : `${TAB_LABELS[tab]} 없음`}
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "20px" }}>
              {search ? "검색 결과가 없습니다." : "첫 번째 링크를 만들어보세요."}
            </p>
            {!search && (
              <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm btn-pill">
                <PlusIcon size={15} />새 링크
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>링크</th>
                  <th>원본 URL</th>
                  <th>클릭</th>
                  {tab === "temp" && <th>만료</th>}
                  {tab === "app" && <th>iOS/Android</th>}
                  <th>생성일</th>
                  <th>상태</th>
                  <th style={{ textAlign: "right" }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id}>
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.9rem" }}>/{link.slug}</span>
                      {link.is_dynamic === 1 && <span style={{ marginLeft: "6px", fontSize: "0.6875rem", color: "var(--color-arc)", fontWeight: 600 }}>다이나믹</span>}
                    </td>
                    <td>
                      <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                        {link.title ? link.title : truncate(link.original_url, 40)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{formatNumber(link.click_count)}</span>
                    </td>
                    {tab === "temp" && (
                      <td style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                        {link.expires_at ? formatDate(link.expires_at) : ""}
                        {link.max_clicks ? <span style={{ display: "block" }}>{link.max_clicks}회 클릭</span> : ""}
                      </td>
                    )}
                    {tab === "app" && (
                      <td style={{ fontSize: "0.8125rem" }}>
                        {link.ios_url && <div style={{ color: "var(--color-muted)" }}>iOS: {truncate(link.ios_url, 25)}</div>}
                        {link.android_url && <div style={{ color: "var(--color-muted)" }}>Android: {truncate(link.android_url, 25)}</div>}
                      </td>
                    )}
                    <td style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                      {formatRelativeTime(link.created_at)}
                    </td>
                    <td>
                      <span className={`badge ${link.is_active ? "badge-success" : "badge"}`} style={{ fontSize: "0.6875rem" }}>
                        {link.is_active ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                        <button onClick={() => handleCopy(link.slug)} className="btn btn-ghost btn-sm btn-icon" title="복사">
                          {copiedSlug === link.slug ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                        </button>
                        <button onClick={() => setEditingLink(link)} className="btn btn-ghost btn-sm btn-icon" title="수정">
                          <EditIcon size={14} />
                        </button>
                        <Link href={`/dashboard/analytics/${link.id}`} className="btn btn-ghost btn-sm btn-icon" title="분석">
                          <BarChartIcon size={14} />
                        </Link>
                        <Link href={`/dashboard/qr?url=https://krl.kr/${link.slug}`} className="btn btn-ghost btn-sm btn-icon" title="QR 코드">
                          <QrCodeIcon size={14} />
                        </Link>
                        <a href={link.original_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm btn-icon" title="원본 URL">
                          <ExternalLinkIcon size={14} />
                        </a>
                        <button onClick={() => setDeleteConfirm(link.id)} className="btn btn-ghost btn-sm btn-icon" title="삭제" style={{ color: "var(--color-danger)" }}>
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{page} / {pages} 페이지</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => fetchLinks(page - 1, search)} disabled={page <= 1} className="btn btn-secondary btn-sm btn-pill">이전</button>
              <button onClick={() => fetchLinks(page + 1, search)} disabled={page >= pages} className="btn btn-secondary btn-sm btn-pill">다음</button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateLinkModal
          tab={tab}
          onClose={() => setShowCreate(false)}
          onCreated={(link) => { setLinks((prev) => [link, ...prev]); setTotal((t) => t + 1); }}
        />
      )}

      {editingLink && (
        <EditLinkModal
          link={editingLink}
          onClose={() => setEditingLink(null)}
          onUpdated={(updated) => {
            setLinks((prev) => prev.map((l) => l.id === updated.id ? updated : l));
            setEditingLink(null);
          }}
        />
      )}

      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,19,0.5)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "var(--color-lifted)", borderRadius: "var(--radius-xl)", padding: "32px", maxWidth: "400px", width: "100%", border: "1px solid var(--color-hairline-strong)" }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "12px" }}>링크 삭제</h3>
            <p style={{ color: "var(--color-muted)", marginBottom: "24px" }}>이 링크를 삭제하면 복구할 수 없습니다. 계속하시겠습니까?</p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary btn-pill" style={{ flex: 1, justifyContent: "center" }}>취소</button>
              <button onClick={() => handleDelete(deleteConfirm!)} className="btn btn-pill" style={{ flex: 1, justifyContent: "center", background: "var(--color-danger)", color: "white", border: "none" }}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {copiedSlug && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "var(--color-ink)", color: "var(--color-canvas)", padding: "10px 16px", borderRadius: "var(--radius-pill)", fontSize: "0.875rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px", boxShadow: "var(--shadow-card)", zIndex: 100 }}>
          <CheckIcon size={16} strokeWidth={2.5} />복사되었습니다
        </div>
      )}
    </div>
  );
}

export default function LinksPage() {
  return (
    <Suspense fallback={<div style={{ padding: "64px", textAlign: "center", color: "var(--color-muted)" }}>로딩 중...</div>}>
      <LinksPageInner />
    </Suspense>
  );
}
