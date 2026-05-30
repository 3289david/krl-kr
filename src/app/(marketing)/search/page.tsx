"use client";
import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// ─── AI Summary Box ───────────────────────────────────────────────────────────
// 로딩은 백그라운드에서 조용히 — 데이터 도착 후에만 박스 표시
function AISummaryBox({ query, snippets }: {
  query: string;
  snippets: { title: string; content: string; url: string }[];
}) {
  const [summary, setSummary] = useState<string | null>(null); // null = not yet loaded
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current || !query.trim() || snippets.length === 0) return;
    calledRef.current = true;

    const controller = new AbortController();

    fetch("/api/v1/ai/search-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, snippets }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        const text = (data.summary ?? "").trim();
        if (text) setSummary(text);
      })
      .catch(() => { /* 실패해도 조용히 */ });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 데이터 없으면 아무것도 렌더하지 않음 — 로딩 중엔 invisible
  if (!summary) return null;

  return (
    <>
      <style>{`
        @keyframes ai-fadein {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ai-shimmer {
          background: linear-gradient(
            90deg,
            var(--color-surface-card) 25%,
            var(--color-lifted) 50%,
            var(--color-surface-card) 75%
          );
          background-size: 200% 100%;
          animation: ai-shimmer 1.6s ease infinite;
        }
        @keyframes ai-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={{
        margin: "4px 0 18px",
        borderRadius: "10px",
        border: "1px solid var(--color-hairline)",
        background: "var(--color-canvas)",
        overflow: "hidden",
        animation: "ai-fadein 0.3s ease both",
      }}>
        {/* 헤더 */}
        <div style={{
          display: "flex", alignItems: "center", gap: "7px",
          padding: "10px 14px 9px",
          borderBottom: "1px solid var(--color-hairline)",
          background: "var(--color-surface-card)",
        }}>
          {/* 반짝이는 별 아이콘 */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span style={{
            fontSize: "0.75rem", fontWeight: 700,
            color: "var(--color-ink)", letterSpacing: "0.02em",
            fontFamily: "var(--font-sans)",
          }}>AI 요약</span>
        </div>

        {/* 본문 */}
        <div style={{ padding: "13px 14px 14px" }}>
          <p style={{
            fontSize: "0.9rem",
            color: "var(--color-body)",
            lineHeight: 1.75,
            margin: 0,
            fontFamily: "var(--font-sans)",
          }}>
            {summary}
          </p>
        </div>

        {/* 푸터 */}
        <div style={{
          padding: "7px 14px",
          borderTop: "1px solid var(--color-hairline)",
          background: "var(--color-surface-card)",
          display: "flex", alignItems: "center", gap: "5px",
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-ash)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ fontSize: "0.7rem", color: "var(--color-ash)", fontFamily: "var(--font-sans)" }}>
            AI가 생성한 내용으로 부정확할 수 있습니다
          </span>
        </div>
      </div>
    </>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface SearchResult {
  url: string;
  title: string;
  content?: string;
  engine?: string;
  engines?: string[];
  score?: number;
  img_src?: string;
  thumbnail?: string;
}

interface SearchResponse {
  results: SearchResult[];
  number_of_results?: number;
  suggestions?: string[];
  answers?: string[];
  corrections?: string[];
  error?: string;
}

// ─── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "general",  label: "전체",   icon: "M4 6h16M4 12h16M4 18h7" },
  { id: "web",      label: "웹",     icon: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M2 12h20 M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z" },
  { id: "images",   label: "이미지", icon: "M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 21" },
  { id: "news",     label: "뉴스",   icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v10a2 2 0 01-2 2z M17 20v-8H7v8 M7 4v4h8" },
  { id: "videos",   label: "동영상", icon: "M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" },
  { id: "science",  label: "학술",   icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  { id: "map",      label: "지도",   icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" },
];

const SUGGESTIONS = [
  "날씨", "환율", "뉴스", "AI 도구", "주식 시세",
  "번역기", "개발자 도구", "오픈소스", "리눅스 명령어",
];

// ─── Favicon helper ───────────────────────────────────────────────────────────
function Favicon({ url }: { url: string }) {
  const [ok, setOk] = useState(true);
  let host = "";
  try { host = new URL(url).hostname; } catch { /* ignore */ }
  if (!ok || !host) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="var(--color-muted)" strokeWidth="1.75"
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z" />
      </svg>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?sz=32&domain=${host}`}
      alt=""
      width={14} height={14}
      onError={() => setOk(false)}
      style={{ borderRadius: "2px", display: "block", flexShrink: 0 }}
    />
  );
}

// ─── Search Icon ──────────────────────────────────────────────────────────────
function SearchIcon({ size = 18, color = "var(--color-muted)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ─── Category Tabs ────────────────────────────────────────────────────────────
function CategoryTabs({ value, onChange, compact }: {
  value: string; onChange: (v: string) => void; compact?: boolean;
}) {
  return (
    <div style={{
      display: "flex", gap: "6px", flexWrap: compact ? "nowrap" : "wrap",
      overflowX: compact ? "auto" : "visible",
      scrollbarWidth: "none",
      justifyContent: compact ? "flex-start" : "center",
      padding: compact ? "0 2px" : "0",
    } as React.CSSProperties}>
      {CATEGORIES.map((cat) => {
        const active = cat.id === value;
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: compact ? "5px 11px" : "5px 14px",
              borderRadius: "99px",
              border: "1px solid",
              borderColor: active ? "var(--color-ink)" : "var(--color-hairline-strong)",
              background: active ? "var(--color-ink)" : "var(--color-lifted)",
              color: active ? "var(--color-canvas)" : "var(--color-body)",
              cursor: "pointer",
              fontSize: compact ? "0.8125rem" : "0.8125rem",
              fontWeight: active ? 600 : 400,
              fontFamily: "var(--font-sans)",
              whiteSpace: "nowrap", flexShrink: 0,
              transition: "all 0.15s",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={cat.icon} />
            </svg>
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Result Card ─────────────────────────────────────────────────────────────
function ResultCard({ result }: { result: SearchResult }) {
  let host = "";
  let breadcrumb = "";
  try {
    const u = new URL(result.url);
    host = u.hostname.replace(/^www\./, "");
    breadcrumb = u.hostname + (u.pathname !== "/" ? u.pathname : "");
  } catch { /* ignore */ }

  return (
    <div style={{
      padding: "16px 0",
      borderBottom: "1px solid var(--color-hairline)",
    }}>
      {/* site info */}
      <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "6px" }}>
        <Favicon url={result.url} />
        <span style={{
          fontSize: "0.8125rem", color: "var(--color-muted)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          maxWidth: "480px",
        }}>{breadcrumb || host}</span>
      </div>
      {/* title */}
      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: "1.0625rem", fontWeight: 600,
          color: "#1a0dab",
          textDecoration: "none",
          lineHeight: 1.3,
          display: "block",
          marginBottom: "5px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
      >
        {result.title}
      </a>
      {/* snippet */}
      {result.content && (
        <p style={{
          fontSize: "0.875rem", color: "var(--color-body)",
          lineHeight: 1.55, margin: 0,
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        } as React.CSSProperties}>
          {result.content}
        </p>
      )}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingTop: "8px" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ borderBottom: "1px solid var(--color-hairline)", paddingBottom: "20px" }}>
          <div style={{ width: "120px", height: "12px", borderRadius: "6px", background: "var(--color-surface-card)", marginBottom: "10px", animation: "pulse 1.4s ease infinite" }} />
          <div style={{ width: "70%", height: "18px", borderRadius: "6px", background: "var(--color-surface-card)", marginBottom: "8px", animation: "pulse 1.4s ease infinite" }} />
          <div style={{ width: "100%", height: "12px", borderRadius: "6px", background: "var(--color-surface-card)", marginBottom: "6px", animation: "pulse 1.4s ease infinite" }} />
          <div style={{ width: "80%", height: "12px", borderRadius: "6px", background: "var(--color-surface-card)", animation: "pulse 1.4s ease infinite" }} />
        </div>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initQ = searchParams.get("q") ?? "";
  const initCat = searchParams.get("cat") ?? "general";
  const initPage = Number(searchParams.get("p") ?? "1");

  const [query, setQuery] = useState(initQ);
  const [category, setCategory] = useState(initCat);
  const [page, setPage] = useState(initPage);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiKey, setAiKey] = useState(0); // force re-mount AI box on new search
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSearched = results !== null || loading;

  const doSearch = useCallback(async (q: string, cat: string, pg: number) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    setResults(null);
    setAiKey((k) => k + 1);

    // update URL without navigation
    const params = new URLSearchParams({ q: trimmed, cat, p: String(pg) });
    router.replace(`/search?${params.toString()}`, { scroll: false });

    try {
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(trimmed)}&category=${cat}&page=${pg}`);
      const data: SearchResponse = await res.json();
      if (!res.ok) { setError(data.error ?? "검색 실패"); setResults(null); }
      else setResults(data);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Initial search if URL has query
  useEffect(() => {
    if (initQ) doSearch(initQ, initCat, initPage);
    else inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    doSearch(query, category, 1);
  }

  function handleCategory(cat: string) {
    setCategory(cat);
    setPage(1);
    if (query.trim()) doSearch(query, cat, 1);
  }

  function handlePage(pg: number) {
    setPage(pg);
    doSearch(query, category, pg);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Compact top layout (after search) ──
  if (hasSearched) {
    return (
      <div style={{
        maxWidth: "760px", margin: "0 auto",
        padding: "24px 16px 80px",
      }}>
        {/* compact search bar */}
        <form onSubmit={handleSubmit} style={{ marginBottom: "14px" }}>
          <div style={{
            display: "flex", alignItems: "center",
            background: "var(--color-lifted)",
            border: "1.5px solid var(--color-hairline-strong)",
            borderRadius: "99px",
            padding: "5px 6px 5px 16px",
          }}>
            <SearchIcon size={16} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색어를 입력하세요…"
              autoComplete="off"
              style={{
                flex: 1, border: "none", outline: "none",
                background: "transparent",
                fontSize: "0.9375rem",
                color: "var(--color-ink)",
                fontFamily: "var(--font-sans)",
                margin: "0 10px",
              }}
            />
            {query && (
              <button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "4px", display: "flex", alignItems: "center", borderRadius: "50%" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            <button type="submit" style={{
              marginLeft: "6px", padding: "7px 16px", borderRadius: "99px",
              background: "var(--color-ink)", color: "var(--color-canvas)",
              border: "none", cursor: "pointer",
              fontFamily: "var(--font-sans)", fontSize: "0.875rem", fontWeight: 600,
              display: "flex", alignItems: "center", gap: "5px", flexShrink: 0,
            }}>
              <SearchIcon size={14} color="var(--color-canvas)" />
              검색
            </button>
          </div>
        </form>

        {/* category tabs */}
        <div style={{ marginBottom: "20px" }}>
          <CategoryTabs value={category} onChange={handleCategory} compact />
        </div>

        {/* results */}
        {loading && <Skeleton />}
        {error && (
          <div style={{
            padding: "20px", borderRadius: "12px",
            background: "#FFF1F2", border: "1px solid #FECDD3",
            color: "#9B1C1C", fontSize: "0.875rem",
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}
        {results && (
          <>
            {/* result count */}
            {results.number_of_results != null && (
              <p style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginBottom: "4px" }}>
                약 {results.number_of_results.toLocaleString("ko-KR")}개의 결과
              </p>
            )}

            {/* AI summary — only for general/web category on page 1 */}
            {(category === "general" || category === "web") && page === 1 && results.results.length > 0 && (
              <AISummaryBox
                key={aiKey}
                query={query}
                snippets={results.results.slice(0, 5).map((r) => ({
                  title: r.title,
                  content: r.content ?? "",
                  url: r.url,
                }))}
              />
            )}

            {/* answer box */}
            {results.answers && results.answers.length > 0 && (
              <div style={{
                padding: "14px 16px", borderRadius: "10px",
                background: "var(--color-lifted)",
                border: "1px solid var(--color-hairline)",
                marginBottom: "16px", fontSize: "0.9375rem",
                color: "var(--color-ink)",
              }}>
                {results.answers[0]}
              </div>
            )}

            {/* results list */}
            {results.results.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-muted)" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px", display: "block", opacity: 0.4 }}>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p style={{ fontWeight: 600, marginBottom: "4px" }}>검색 결과가 없습니다</p>
                <p style={{ fontSize: "0.875rem" }}>다른 검색어나 카테고리를 시도해 보세요.</p>
              </div>
            ) : (
              <div>
                {results.results.map((r, i) => (
                  <ResultCard key={i} result={r} />
                ))}
              </div>
            )}

            {/* suggestions */}
            {results.suggestions && results.suggestions.length > 0 && (
              <div style={{ marginTop: "24px" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                  관련 검색어
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {results.suggestions.slice(0, 8).map((s) => (
                    <button key={s} onClick={() => { setQuery(s); setPage(1); doSearch(s, category, 1); }}
                      style={{
                        padding: "5px 14px", borderRadius: "99px",
                        background: "var(--color-surface-card)",
                        border: "1px solid var(--color-hairline)",
                        color: "var(--color-body)", cursor: "pointer",
                        fontSize: "0.8125rem", fontFamily: "var(--font-sans)",
                        transition: "border-color 0.12s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-ink)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-hairline)")}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* pagination */}
            {results.results.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "32px", justifyContent: "center" }}>
                {page > 1 && (
                  <button onClick={() => handlePage(page - 1)} style={{
                    padding: "8px 16px", borderRadius: "8px",
                    border: "1px solid var(--color-hairline-strong)",
                    background: "var(--color-lifted)", color: "var(--color-ink)",
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                    fontSize: "0.875rem", fontWeight: 500,
                    display: "flex", alignItems: "center", gap: "5px",
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    이전
                  </button>
                )}
                {[page - 1, page, page + 1, page + 2].filter((n) => n >= 1 && n <= page + 2).map((n) => (
                  <button key={n} onClick={() => handlePage(n)} style={{
                    width: "36px", height: "36px", borderRadius: "8px",
                    border: "1px solid",
                    borderColor: n === page ? "var(--color-ink)" : "var(--color-hairline-strong)",
                    background: n === page ? "var(--color-ink)" : "var(--color-lifted)",
                    color: n === page ? "var(--color-canvas)" : "var(--color-body)",
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                    fontSize: "0.875rem", fontWeight: n === page ? 600 : 400,
                  }}>{n}</button>
                ))}
                <button onClick={() => handlePage(page + 1)} style={{
                  padding: "8px 16px", borderRadius: "8px",
                  border: "1px solid var(--color-hairline-strong)",
                  background: "var(--color-lifted)", color: "var(--color-ink)",
                  cursor: "pointer", fontFamily: "var(--font-sans)",
                  fontSize: "0.875rem", fontWeight: 500,
                  display: "flex", alignItems: "center", gap: "5px",
                }}>
                  다음
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Homepage state (no search yet) ──
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "calc(100vh - 200px)",
      padding: "40px 16px 80px",
    }}>
      {/* logo */}
      <div style={{ marginBottom: "32px", textAlign: "center" }}>
        <div style={{
          width: "56px", height: "56px", borderRadius: "16px",
          background: "var(--color-ink)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px",
        }}>
          <SearchIcon size={26} color="var(--color-canvas)" />
        </div>
        <h1 style={{
          fontFamily: "var(--font-mono)", fontWeight: 800,
          fontSize: "1.75rem", letterSpacing: "0.02em",
          color: "var(--color-ink)", margin: 0,
        }}>검색</h1>
      </div>

      {/* search box */}
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "620px" }}>
        <div style={{
          display: "flex", alignItems: "center",
          background: "var(--color-lifted)",
          border: "1.5px solid var(--color-hairline-strong)",
          borderRadius: "99px",
          padding: "8px 8px 8px 22px",
          boxShadow: "0 2px 16px rgba(20,20,19,0.06)",
        }}>
          <SearchIcon size={18} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색어를 입력하세요…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            style={{
              flex: 1, border: "none", outline: "none",
              background: "transparent",
              fontSize: "1.0625rem",
              color: "var(--color-ink)",
              fontFamily: "var(--font-sans)",
              margin: "0 12px",
            }}
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "4px 8px", display: "flex", borderRadius: "99px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <button type="submit" disabled={!query.trim()} style={{
            padding: "10px 22px", borderRadius: "99px",
            background: query.trim() ? "var(--color-ink)" : "var(--color-surface-card)",
            color: query.trim() ? "var(--color-canvas)" : "var(--color-muted)",
            border: "none", cursor: query.trim() ? "pointer" : "default",
            fontFamily: "var(--font-sans)", fontSize: "0.9375rem", fontWeight: 600,
            flexShrink: 0, transition: "all 0.15s",
          }}>
            검색
          </button>
        </div>

        {/* category tabs */}
        <div style={{ marginTop: "16px" }}>
          <CategoryTabs value={category} onChange={setCategory} />
        </div>
      </form>

      {/* suggestion chips */}
      <div style={{ marginTop: "36px", textAlign: "center", maxWidth: "560px" }}>
        <p style={{
          fontSize: "0.75rem", fontWeight: 600,
          color: "var(--color-muted)", textTransform: "uppercase",
          letterSpacing: "0.06em", marginBottom: "12px",
        }}>추천 검색어</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setQuery(s); setPage(1); doSearch(s, category, 1); }}
              style={{
                padding: "6px 14px", borderRadius: "99px",
                background: "var(--color-surface-card)",
                border: "1px solid var(--color-hairline)",
                color: "var(--color-body)", cursor: "pointer",
                fontSize: "0.875rem", fontFamily: "var(--font-sans)",
                transition: "border-color 0.12s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-ink)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-hairline)")}
            >{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  );
}
