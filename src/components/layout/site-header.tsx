"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

interface User {
  name: string | null;
  email: string;
}

const TOOLS = [
  { href: "/", label: "🔗  URL 단축기", desc: "긴 주소를 짧게" },
  { href: "/qr", label: "⬛  QR 코드", desc: "이미지로 바로 다운로드" },
  { href: "/tools/paste", label: "📋  코드·텍스트 공유", desc: "링크로 공유" },
  { href: "/tools/drop", label: "📁  파일 공유", desc: "파일 업로드 후 링크" },
  { href: "/tools/webhook", label: "🔔  웹훅 테스트", desc: "요청 실시간 확인" },
  { href: "/tools/bio", label: "👤  Link-in-bio", desc: "프로필 링크 모음" },
  { href: "/dashboard/subdomains", label: "🌐  서브도메인", desc: "내이름.krl.kr 등록" },
];

export function SiteHeader() {
  const [user, setUser] = useState<User | null | "loading">("loading");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setUser(d?.user ?? null))
      .catch(() => setUser(null));
  }, [pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on route change
  useEffect(() => { setToolsOpen(false); setAccountOpen(false); setMobileOpen(false); }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  }

  const isLoggedIn = user !== "loading" && user !== null;

  return (
    <>
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(243,240,238,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--color-hairline)",
      }}>
        <div style={{
          maxWidth: "1100px", margin: "0 auto", padding: "0 24px",
          display: "flex", alignItems: "center", height: "52px", gap: "4px",
        }}>
          {/* Logo */}
          <Link href="/" style={{
            fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1rem",
            letterSpacing: "0.04em", color: "var(--color-ink)", textDecoration: "none",
            marginRight: "12px", flexShrink: 0,
          }}>
            KRL.KR
          </Link>

          {/* Desktop nav */}
          <nav className="krl-desktop-nav" style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1 }}>

            {/* Tools dropdown */}
            <div ref={toolsRef} style={{ position: "relative" }}>
              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  padding: "6px 12px", borderRadius: "6px",
                  background: "transparent", border: "none", cursor: "pointer",
                  fontSize: "0.9rem", fontWeight: 500, color: "var(--color-body)",
                  fontFamily: "var(--font-sans)",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = toolsOpen ? "var(--color-surface-card)" : "transparent")}
              >
                도구
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transition: "transform 0.15s", transform: toolsOpen ? "rotate(180deg)" : "none" }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {toolsOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", left: 0,
                  background: "var(--color-white)", border: "1px solid var(--color-hairline)",
                  borderRadius: "12px", boxShadow: "0 8px 32px rgba(20,20,19,0.12)",
                  padding: "8px", minWidth: "240px", zIndex: 200,
                }}>
                  {TOOLS.map((tool) => (
                    <Link key={tool.href} href={tool.href} style={{ textDecoration: "none" }}>
                      <div style={{
                        padding: "10px 12px", borderRadius: "8px", cursor: "pointer",
                        transition: "background 0.1s",
                      }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <p style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--color-ink)", marginBottom: "1px" }}>{tool.label}</p>
                        <p style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>{tool.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/docs" style={{
              padding: "6px 12px", borderRadius: "6px", fontSize: "0.9rem",
              fontWeight: 500, color: "var(--color-body)", textDecoration: "none",
              transition: "background 0.1s",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              API
            </Link>

            {/* Logged in: 내 링크 */}
            {isLoggedIn && (
              <Link href="/dashboard/links" style={{
                padding: "6px 12px", borderRadius: "6px", fontSize: "0.9rem",
                fontWeight: 500, color: "var(--color-body)", textDecoration: "none",
                transition: "background 0.1s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                내 링크
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="krl-desktop-nav" style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            {user === "loading" ? null : isLoggedIn ? (
              /* Account dropdown */
              <div ref={accountRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setAccountOpen(!accountOpen)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "5px 10px", borderRadius: "6px",
                    background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)",
                    cursor: "pointer", fontSize: "0.875rem", fontWeight: 500,
                    color: "var(--color-ink)", fontFamily: "var(--font-sans)",
                  }}
                >
                  <div style={{
                    width: "22px", height: "22px", borderRadius: "50%",
                    background: "var(--color-ink)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: "0.625rem", color: "var(--color-canvas)", fontWeight: 700,
                  }}>
                    {(user as User).email[0].toUpperCase()}
                  </div>
                  {(user as User).name ?? (user as User).email.split("@")[0]}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ transform: accountOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {accountOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    background: "var(--color-white)", border: "1px solid var(--color-hairline)",
                    borderRadius: "12px", boxShadow: "0 8px 32px rgba(20,20,19,0.12)",
                    padding: "8px", minWidth: "180px", zIndex: 200,
                  }}>
                    <p style={{ padding: "8px 12px 4px", fontSize: "0.75rem", color: "var(--color-muted)" }}>
                      {(user as User).email}
                    </p>
                    <div style={{ height: "1px", background: "var(--color-hairline)", margin: "6px 0" }} />
                    {[
                      { href: "/dashboard/links", label: "내 링크" },
                      { href: "/dashboard/api-keys", label: "API 키" },
                      { href: "/dashboard/settings", label: "설정" },
                    ].map((item) => (
                      <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                        <div style={{
                          padding: "9px 12px", borderRadius: "8px", fontSize: "0.875rem",
                          fontWeight: 500, color: "var(--color-ink)", cursor: "pointer",
                          transition: "background 0.1s",
                        }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          {item.label}
                        </div>
                      </Link>
                    ))}
                    <div style={{ height: "1px", background: "var(--color-hairline)", margin: "6px 0" }} />
                    <button onClick={handleLogout} style={{
                      width: "100%", padding: "9px 12px", borderRadius: "8px",
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: "0.875rem", fontWeight: 500, color: "#DC2626",
                      textAlign: "left", fontFamily: "var(--font-sans)", transition: "background 0.1s",
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF1F2")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" style={{
                  padding: "6px 12px", borderRadius: "6px", fontSize: "0.875rem",
                  fontWeight: 500, color: "var(--color-body)", textDecoration: "none",
                }}>
                  로그인
                </Link>
                <Link href="/register" style={{
                  padding: "7px 14px", borderRadius: "6px", fontSize: "0.875rem",
                  fontWeight: 600, color: "var(--color-canvas)", textDecoration: "none",
                  background: "var(--color-ink)", transition: "opacity 0.1s",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  회원가입
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="krl-mobile-only"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: "none", marginLeft: "auto",
              background: "none", border: "none", cursor: "pointer",
              padding: "6px", color: "var(--color-ink)",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen
                ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={{
            borderTop: "1px solid var(--color-hairline)",
            background: "var(--color-white)", padding: "12px 16px 16px",
          }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.04em",
              textTransform: "uppercase", color: "var(--color-muted)", padding: "8px 4px 4px" }}>
              도구
            </p>
            {TOOLS.map((tool) => (
              <Link key={tool.href} href={tool.href} style={{
                display: "block", padding: "10px 4px", fontSize: "0.9375rem",
                fontWeight: 500, color: "var(--color-ink)", textDecoration: "none",
                borderBottom: "1px solid var(--color-hairline)",
              }}>
                {tool.label}
              </Link>
            ))}
            <Link href="/docs" style={{
              display: "block", padding: "10px 4px", fontSize: "0.9375rem",
              fontWeight: 500, color: "var(--color-ink)", textDecoration: "none",
              borderBottom: "1px solid var(--color-hairline)",
            }}>
              API
            </Link>
            {isLoggedIn ? (
              <>
                <Link href="/dashboard/links" style={{
                  display: "block", padding: "10px 4px", fontSize: "0.9375rem",
                  fontWeight: 500, color: "var(--color-ink)", textDecoration: "none",
                  borderBottom: "1px solid var(--color-hairline)",
                }}>내 링크</Link>
                <Link href="/dashboard/settings" style={{
                  display: "block", padding: "10px 4px", fontSize: "0.9375rem",
                  fontWeight: 500, color: "var(--color-ink)", textDecoration: "none",
                  borderBottom: "1px solid var(--color-hairline)",
                }}>설정</Link>
                <button onClick={handleLogout} style={{
                  display: "block", width: "100%", padding: "10px 4px",
                  background: "none", border: "none", textAlign: "left",
                  fontSize: "0.9375rem", fontWeight: 500, color: "#DC2626",
                  cursor: "pointer", fontFamily: "var(--font-sans)",
                }}>로그아웃</button>
              </>
            ) : (
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <Link href="/login" className="btn btn-ghost btn-pill" style={{ textDecoration: "none", flex: 1, justifyContent: "center" }}>로그인</Link>
                <Link href="/register" className="btn btn-primary btn-pill" style={{ textDecoration: "none", flex: 1, justifyContent: "center" }}>회원가입</Link>
              </div>
            )}
          </div>
        )}
      </header>

      <style>{`
        @media (max-width: 640px) {
          .krl-desktop-nav { display: none !important; }
          .krl-mobile-only { display: flex !important; }
        }
        @media (min-width: 641px) {
          .krl-mobile-only { display: none !important; }
        }
      `}</style>
    </>
  );
}
