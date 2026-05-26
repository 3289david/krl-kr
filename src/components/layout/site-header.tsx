"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

interface User { name: string | null; email: string }

// SVG icon components (inline, small)
function Icon({ d, d2, type = "path" }: { d: string; d2?: string; type?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, color: "var(--color-muted)" }}>
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  );
}

const NAV_MENUS = [
  {
    label: "링크 · QR",
    items: [
      { href: "/", icon: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", icon2: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71", label: "URL 단축기", desc: "krl.kr/abc 형태의 짧은 주소" },
      { href: "/qr", icon: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h4 M18 14v4 M14 18h4 M18 18v4", label: "QR 코드", desc: "SVG·PNG 다운로드, 로고 삽입" },
      { href: "/dashboard/links?tab=dynamic", icon: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4", label: "다이나믹 링크", desc: "QR 유지하면서 목적지 변경" },
      { href: "/dashboard/links?tab=temp", icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2", label: "임시 링크", desc: "시간·클릭 후 자동 만료" },
      { href: "/dashboard/links?tab=app", icon: "M12 18h.01 M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z", label: "앱 링크", desc: "iOS/Android별 주소 분기" },
    ],
  },
  {
    label: "파일 · 공유",
    items: [
      { href: "/tools/drop", icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12", label: "파일 공유", desc: "업로드 후 링크로 공유" },
      { href: "/tools/paste", icon: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z", label: "코드·텍스트 공유", desc: "붙여넣고 링크로 공유" },
      { href: "/dashboard/email", icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6", label: "이메일 수신함", desc: "이름@krl.kr로 메일 수신" },
      { href: "/tools/webhook", icon: "M18 16.98h-5.99c-1.1 0-1.95.68-2.23 1.61A3 3 0 0 1 2 17c0-1.66 1.34-3 3-3h.5 M12 3C9.24 3 7 5.24 7 8c0 2.16 1.28 3.99 3.12 4.82 M17 8c0-2.76-2.24-5-5-5 M22 8c0 2.76-2.24 5-5 5h-1", label: "웹훅 테스트", desc: "요청 실시간 확인" },
    ],
  },
  {
    label: "웹사이트",
    items: [
      { href: "/dashboard/subdomains", icon: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z", label: "서브도메인", desc: "내이름.krl.kr 주소 만들기" },
      { href: "/tools/bio", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", label: "Link-in-bio", desc: "krl.kr/@닉네임 프로필 페이지" },
      { href: "/dashboard/subdomains?tab=html", icon: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M13 2v7h7", label: "HTML 배포", desc: "HTML 입력하면 HTTPS 자동 적용" },
      { href: "/dashboard/subdomains?tab=redirect", icon: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8 M3 3v5h5 M12 7v5l3 3", label: "리다이렉트", desc: "krl.kr 주소에서 다른 URL로 이동" },
    ],
  },
];

function DropdownMenu({ menu, onClose }: { menu: typeof NAV_MENUS[0]; onClose: () => void }) {
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 8px)", left: 0,
      background: "var(--color-white)", border: "1px solid var(--color-hairline)",
      borderRadius: "12px", boxShadow: "0 8px 32px rgba(20,20,19,0.12)",
      padding: "8px", minWidth: "260px", zIndex: 200,
    }}>
      {menu.items.map((item) => (
        <Link key={item.href} href={item.href} onClick={onClose} style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "9px 10px", borderRadius: "8px", cursor: "pointer", transition: "background 0.1s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ marginTop: "2px", flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: "var(--color-muted)" }}>
                <path d={item.icon} />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-ink)", marginBottom: "1px" }}>{item.label}</p>
              <p style={{ fontSize: "0.775rem", color: "var(--color-muted)", lineHeight: 1.3 }}>{item.desc}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function NavDropdown({ menu }: { menu: typeof NAV_MENUS[0] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: "3px",
        padding: "6px 10px", borderRadius: "6px", background: "transparent",
        border: "none", cursor: "pointer", fontSize: "0.875rem",
        fontWeight: 500, color: "var(--color-body)", fontFamily: "var(--font-sans)",
        transition: "background 0.1s",
      }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        {menu.label}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <DropdownMenu menu={menu} onClose={() => setOpen(false)} />}
    </div>
  );
}

export function SiteHeader() {
  const [user, setUser] = useState<User | null | "loading">("loading");
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setUser(d?.user ?? null))
      .catch(() => setUser(null));
  }, [pathname]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setAccountOpen(false); setMobileOpen(false); }, [pathname]);

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
          display: "flex", alignItems: "center", height: "52px", gap: "2px",
        }}>
          {/* Logo */}
          <Link href="/" style={{
            fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1rem",
            letterSpacing: "0.04em", color: "var(--color-ink)", textDecoration: "none",
            marginRight: "16px", flexShrink: 0,
          }}>KRL.KR</Link>

          {/* Desktop nav */}
          <nav className="krl-desktop-nav" style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1 }}>
            {NAV_MENUS.map((menu) => (
              <NavDropdown key={menu.label} menu={menu} />
            ))}

            <Link href="/community" style={{
              padding: "6px 10px", borderRadius: "6px", fontSize: "0.875rem",
              fontWeight: 500, color: "var(--color-body)", textDecoration: "none", transition: "background 0.1s",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >커뮤니티</Link>

            <Link href="/docs" style={{
              padding: "6px 10px", borderRadius: "6px", fontSize: "0.875rem",
              fontWeight: 500, color: "var(--color-body)", textDecoration: "none", transition: "background 0.1s",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >API</Link>

            {isLoggedIn && (
              <Link href="/dashboard/links" style={{
                padding: "6px 10px", borderRadius: "6px", fontSize: "0.875rem",
                fontWeight: 500, color: "var(--color-body)", textDecoration: "none", transition: "background 0.1s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >내 링크</Link>
            )}
          </nav>

          {/* Right */}
          <div className="krl-desktop-nav" style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {user === "loading" ? null : isLoggedIn ? (
              <div ref={accountRef} style={{ position: "relative" }}>
                <button onClick={() => setAccountOpen(!accountOpen)} style={{
                  display: "flex", alignItems: "center", gap: "6px", padding: "5px 10px",
                  borderRadius: "6px", background: "var(--color-surface-card)",
                  border: "1px solid var(--color-hairline)", cursor: "pointer",
                  fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-ink)",
                  fontFamily: "var(--font-sans)",
                }}>
                  <div style={{
                    width: "20px", height: "20px", borderRadius: "50%",
                    background: "var(--color-ink)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: "0.625rem", color: "var(--color-canvas)", fontWeight: 700,
                  }}>
                    {(user as User).email[0].toUpperCase()}
                  </div>
                  {(user as User).name ?? (user as User).email.split("@")[0]}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
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
                    <p style={{ padding: "6px 10px 4px", fontSize: "0.75rem", color: "var(--color-muted)" }}>
                      {(user as User).email}
                    </p>
                    <div style={{ height: "1px", background: "var(--color-hairline)", margin: "4px 0" }} />
                    {[
                      { href: "/dashboard/links", label: "내 링크" },
                      { href: "/dashboard/api-keys", label: "API 키" },
                      { href: "/dashboard/settings", label: "설정" },
                    ].map((item) => (
                      <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                        <div style={{ padding: "8px 10px", borderRadius: "6px", fontSize: "0.875rem", fontWeight: 500, color: "var(--color-ink)", cursor: "pointer", transition: "background 0.1s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >{item.label}</div>
                      </Link>
                    ))}
                    <div style={{ height: "1px", background: "var(--color-hairline)", margin: "4px 0" }} />
                    <button onClick={handleLogout} style={{
                      width: "100%", padding: "8px 10px", borderRadius: "6px",
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: "0.875rem", fontWeight: 500, color: "#DC2626",
                      textAlign: "left", fontFamily: "var(--font-sans)", transition: "background 0.1s",
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF1F2")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >로그아웃</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" style={{
                  padding: "6px 10px", borderRadius: "6px", fontSize: "0.875rem",
                  fontWeight: 500, color: "var(--color-body)", textDecoration: "none",
                }}>로그인</Link>
                <Link href="/register" style={{
                  padding: "7px 14px", borderRadius: "6px", fontSize: "0.875rem",
                  fontWeight: 600, color: "var(--color-canvas)", textDecoration: "none",
                  background: "var(--color-ink)", transition: "opacity 0.1s",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >회원가입</Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="krl-mobile-only" onClick={() => setMobileOpen(!mobileOpen)} style={{
            display: "none", marginLeft: "auto", background: "none",
            border: "none", cursor: "pointer", padding: "6px", color: "var(--color-ink)",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen
                ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={{ borderTop: "1px solid var(--color-hairline)", background: "var(--color-white)", padding: "8px 16px 16px", maxHeight: "80vh", overflowY: "auto" }}>
            {NAV_MENUS.map((menu) => (
              <div key={menu.label}>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted)", padding: "12px 4px 4px" }}>
                  {menu.label}
                </p>
                {menu.items.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} style={{
                    display: "flex", alignItems: "center", gap: "10px", padding: "10px 4px",
                    fontSize: "0.9375rem", fontWeight: 500, color: "var(--color-ink)", textDecoration: "none",
                    borderBottom: "1px solid var(--color-hairline)",
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-muted)", flexShrink: 0 }}>
                      <path d={item.icon} />
                    </svg>
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
            <div style={{ height: "1px", background: "var(--color-hairline)", margin: "8px 0" }} />
            {[{ href: "/community", label: "커뮤니티" }, { href: "/docs", label: "API" }].map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} style={{
                display: "block", padding: "10px 4px", fontSize: "0.9375rem",
                fontWeight: 500, color: "var(--color-ink)", textDecoration: "none",
                borderBottom: "1px solid var(--color-hairline)",
              }}>{item.label}</Link>
            ))}
            {isLoggedIn ? (
              <>
                <Link href="/dashboard/links" onClick={() => setMobileOpen(false)} style={{ display: "block", padding: "10px 4px", fontSize: "0.9375rem", fontWeight: 500, color: "var(--color-ink)", textDecoration: "none", borderBottom: "1px solid var(--color-hairline)" }}>내 링크</Link>
                <button onClick={handleLogout} style={{ display: "block", width: "100%", padding: "10px 4px", background: "none", border: "none", textAlign: "left", fontSize: "0.9375rem", fontWeight: 500, color: "#DC2626", cursor: "pointer", fontFamily: "var(--font-sans)" }}>로그아웃</button>
              </>
            ) : (
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <Link href="/login" style={{ display: "block", flex: 1, padding: "10px", textAlign: "center", border: "1px solid var(--color-hairline)", borderRadius: "6px", fontSize: "0.9375rem", fontWeight: 500, color: "var(--color-ink)", textDecoration: "none" }}>로그인</Link>
                <Link href="/register" style={{ display: "block", flex: 1, padding: "10px", textAlign: "center", background: "var(--color-ink)", borderRadius: "6px", fontSize: "0.9375rem", fontWeight: 600, color: "var(--color-canvas)", textDecoration: "none" }}>회원가입</Link>
              </div>
            )}
          </div>
        )}
      </header>

      <style>{`
        @media (max-width: 768px) {
          .krl-desktop-nav { display: none !important; }
          .krl-mobile-only { display: flex !important; }
        }
        @media (min-width: 769px) {
          .krl-mobile-only { display: none !important; }
        }
      `}</style>
    </>
  );
}
