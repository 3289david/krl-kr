"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const CATEGORIES = [
  { id: "general",  label: "전체" },
  { id: "web",      label: "웹" },
  { id: "images",   label: "이미지" },
  { id: "news",     label: "뉴스" },
  { id: "videos",   label: "동영상" },
  { id: "science",  label: "학술" },
  { id: "map",      label: "지도" },
];

const SUGGESTIONS = [
  "날씨", "환율", "뉴스", "KRL.KR", "주식", "번역", "지도",
  "AI 도구", "개발자 도구", "오픈소스",
];

function SearchPageInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQ);
  const [category, setCategory] = useState("general");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function doSearch(q = query, cat = category) {
    const trimmed = q.trim();
    if (!trimmed) return;
    window.location.href =
      `https://searxng.exe.xyz/search?q=${encodeURIComponent(trimmed)}&categories=${cat}&language=ko-KR`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doSearch();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setQuery("");
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "var(--color-canvas)",
      display: "flex",
      flexDirection: "column",
      fontFamily: "var(--font-sans)",
    }}>
      {/* top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 24px", borderBottom: "1px solid var(--color-hairline)",
      }}>
        <Link href="/" style={{
          fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1rem",
          letterSpacing: "0.04em", color: "var(--color-ink)", textDecoration: "none",
        }}>KRL.KR</Link>
        <Link href="/dashboard" style={{
          fontSize: "0.8125rem", color: "var(--color-muted)",
          textDecoration: "none", padding: "5px 12px",
          border: "1px solid var(--color-hairline)", borderRadius: "99px",
        }}>대시보드</Link>
      </div>

      {/* center block */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 16px 80px",
      }}>
        {/* logo */}
        <div style={{ marginBottom: "36px", textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "10px",
            marginBottom: "10px",
          }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "14px",
              background: "var(--color-ink)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-canvas)" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <span style={{
              fontFamily: "var(--font-mono)", fontWeight: 800,
              fontSize: "1.5rem", letterSpacing: "0.04em", color: "var(--color-ink)",
            }}>검색</span>
          </div>
          <p style={{ fontSize: "0.9rem", color: "var(--color-muted)", marginTop: "4px" }}>
            개인정보를 수집하지 않는 독립 검색
          </p>
        </div>

        {/* search box */}
        <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "640px" }}>
          <div style={{
            display: "flex", alignItems: "center",
            background: "var(--color-lifted)",
            border: "1.5px solid var(--color-hairline-strong)",
            borderRadius: "99px",
            padding: "6px 8px 6px 20px",
            boxShadow: "0 2px 12px rgba(20,20,19,0.07)",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
            onFocus={() => {}}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="var(--color-muted)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0, marginRight: "10px" }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="검색어를 입력하세요…"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "1rem",
                color: "var(--color-ink)",
                fontFamily: "var(--font-sans)",
                minWidth: 0,
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--color-muted)", padding: "4px", display: "flex",
                  alignItems: "center", borderRadius: "50%",
                }}
                aria-label="지우기"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            <button
              type="submit"
              disabled={!query.trim()}
              style={{
                marginLeft: "8px",
                padding: "9px 20px",
                borderRadius: "99px",
                background: query.trim() ? "var(--color-ink)" : "var(--color-surface-card)",
                color: query.trim() ? "var(--color-canvas)" : "var(--color-muted)",
                border: "none",
                cursor: query.trim() ? "pointer" : "default",
                fontFamily: "var(--font-sans)",
                fontSize: "0.9rem",
                fontWeight: 600,
                flexShrink: 0,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              검색
            </button>
          </div>

          {/* category tabs */}
          <div style={{
            display: "flex", gap: "6px", marginTop: "14px",
            justifyContent: "center", flexWrap: "wrap",
          }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                style={{
                  padding: "5px 14px", borderRadius: "99px",
                  border: "1px solid",
                  borderColor: category === cat.id
                    ? "var(--color-ink)"
                    : "var(--color-hairline-strong)",
                  background: category === cat.id
                    ? "var(--color-ink)"
                    : "var(--color-lifted)",
                  color: category === cat.id
                    ? "var(--color-canvas)"
                    : "var(--color-body)",
                  cursor: "pointer",
                  fontSize: "0.8125rem",
                  fontWeight: category === cat.id ? 600 : 400,
                  fontFamily: "var(--font-sans)",
                  transition: "all 0.15s",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </form>

        {/* suggestions */}
        {!query && (
          <div style={{ marginTop: "40px", textAlign: "center", maxWidth: "560px" }}>
            <p style={{
              fontSize: "0.75rem", fontWeight: 600,
              color: "var(--color-muted)", textTransform: "uppercase",
              letterSpacing: "0.06em", marginBottom: "12px",
            }}>추천 검색어</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); doSearch(s); }}
                  style={{
                    padding: "6px 14px", borderRadius: "99px",
                    background: "var(--color-surface-card)",
                    border: "1px solid var(--color-hairline)",
                    color: "var(--color-body)",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontFamily: "var(--font-sans)",
                    transition: "border-color 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-ink)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-hairline)")}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* features */}
        <div style={{
          marginTop: "56px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
          width: "100%", maxWidth: "560px",
        }}>
          {[
            { icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", label: "추적 없음", desc: "IP·쿼리 저장 없음" },
            { icon: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0", label: "광고 없음", desc: "순수 검색 결과" },
            { icon: "M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0 M12 8v4l3 3", label: "빠른 검색", desc: "여러 엔진 통합" },
          ].map((f) => (
            <div key={f.label} style={{
              padding: "16px",
              background: "var(--color-lifted)",
              border: "1px solid var(--color-hairline)",
              borderRadius: "12px",
              textAlign: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-muted)" strokeWidth="1.75"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ margin: "0 auto 8px", display: "block" }}>
                <path d={f.icon} />
              </svg>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-ink)", marginBottom: "2px" }}>{f.label}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Keyboard hint */}
      <div style={{
        position: "fixed", bottom: "20px", left: "50%",
        transform: "translateX(-50%)",
        fontSize: "0.75rem", color: "var(--color-muted)",
        display: "flex", alignItems: "center", gap: "6px",
        pointerEvents: "none",
      }}>
        <kbd style={{
          padding: "2px 6px", borderRadius: "4px",
          background: "var(--color-surface-card)",
          border: "1px solid var(--color-hairline-strong)",
          fontFamily: "var(--font-mono)", fontSize: "0.7rem",
        }}>Enter</kbd>
        검색
        <span style={{ margin: "0 4px" }}>·</span>
        <kbd style={{
          padding: "2px 6px", borderRadius: "4px",
          background: "var(--color-surface-card)",
          border: "1px solid var(--color-hairline-strong)",
          fontFamily: "var(--font-mono)", fontSize: "0.7rem",
        }}>Esc</kbd>
        지우기
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  );
}
