"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
const ReportModal = dynamic(() => import("@/components/report-modal"), { ssr: false });

interface User { name: string | null; email: string }

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItemConfig {
  id: string;
  href: string;
  label: string;
  desc?: string;
  icon?: string;
  icon2?: string;
  visible: boolean;
}

interface NavMenuConfig {
  id: string;
  label: string;
  visible: boolean;
  items: NavItemConfig[];
}

interface SimpleLinkConfig {
  id: string;
  href: string;
  label: string;
  icon?: string;
  visible: boolean;
}

interface HeaderConfig {
  logo: { text: string; href: string };
  navMenus: NavMenuConfig[];
  simpleLinks: SimpleLinkConfig[];
  rightButtons: {
    search: { visible: boolean; href: string };
    report: { visible: boolean };
    donate: { visible: boolean; href: string; label: string };
  };
}

// ─── Default Config (matches site defaults) ───────────────────────────────────

const DEFAULT_CONFIG: HeaderConfig = {
  logo: { text: "KRL.KR", href: "/" },
  navMenus: [
    {
      id: "krl-services", label: "KRL 서비스", visible: true,
      items: [
        { id: "notes", href: "/dashboard/notes", label: "KRL Notes", desc: "클라우드 메모 서비스", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8", visible: true },
        { id: "tasks", href: "/dashboard/tasks", label: "KRL Tasks", desc: "할 일 관리", icon: "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11", visible: true },
        { id: "calendar", href: "/dashboard/calendar", label: "KRL Calendar", desc: "일정 관리", icon: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", visible: true },
        { id: "docs", href: "/dashboard/docs", label: "KRL Docs", desc: "문서 작성 · 공동편집", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6", visible: true },
        { id: "whiteboard", href: "/dashboard/whiteboard", label: "KRL Whiteboard", desc: "온라인 화이트보드", icon: "M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z", visible: true },
        { id: "git", href: "/dashboard/git", label: "KRL Git", desc: "코드 저장소", icon: "M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z", visible: true },
        { id: "forms", href: "/dashboard/forms", label: "KRL Forms", desc: "설문 폼 제작", icon: "M9 11l3 3 8-8 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11", visible: true },
        { id: "convert", href: "/dashboard/convert", label: "KRL Convert", desc: "파일 변환 서비스", icon: "M7 16V4m0 0L3 8m4-4l4 4 M17 8v12m0 0l4-4m-4 4l-4-4", visible: true },
        { id: "study", href: "/dashboard/study", label: "KRL Study", desc: "공부 타이머 · 목표", icon: "M12 20h9 M12 4v16 M4 4h8 M4 12h8 M4 20h8", visible: true },
        { id: "wiki", href: "/dashboard/wiki", label: "KRL Wiki", desc: "위키 만들기", icon: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 0 1 3h9z", visible: true },
        { id: "vault", href: "/dashboard/vault", label: "KRL Vault", desc: "비밀번호 보관함", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", visible: true },
        { id: "box", href: "/dashboard/box", label: "KRL Box", desc: "디지털 보관함", icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z", visible: true },
        { id: "space", href: "/dashboard/space", label: "KRL Space", desc: "웹사이트 빌더", icon: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5", visible: true },
        { id: "codes", href: "/dashboard/codes", label: "KRL Codes", desc: "초대·쿠폰·라이선스·OTP·URL 단축", icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z", visible: true },
      ],
    },
    {
      id: "links-qr", label: "링크 · QR", visible: true,
      items: [
        { id: "url-shortener", href: "/", label: "URL 단축기", desc: "krl.kr/abc 형태의 짧은 주소", icon: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", icon2: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71", visible: true },
        { id: "qr-code", href: "/qr", label: "QR 코드", desc: "SVG·PNG 다운로드, 로고 삽입", icon: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h4 M18 14v4 M14 18h4 M18 18v4", visible: true },
        { id: "dynamic-link", href: "/dashboard/links?tab=dynamic", label: "다이나믹 링크", desc: "QR 유지하면서 목적지 변경", icon: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4", visible: true },
        { id: "temp-link", href: "/dashboard/links?tab=temp", label: "임시 링크", desc: "시간·클릭 후 자동 만료", icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2", visible: true },
        { id: "app-link", href: "/dashboard/links?tab=app", label: "앱 링크", desc: "iOS/Android별 주소 분기", icon: "M12 18h.01 M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z", visible: true },
      ],
    },
    {
      id: "files-share", label: "파일 · 공유", visible: true,
      items: [
        { id: "file-share", href: "/tools/drop", label: "파일 공유", desc: "업로드 후 링크로 공유", icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12", visible: true },
        { id: "paste", href: "/tools/paste", label: "코드·텍스트 공유", desc: "붙여넣고 링크로 공유", icon: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z", visible: true },
        { id: "email", href: "/dashboard/email", label: "이메일 수신함", desc: "이름@krl.kr로 메일 수신", icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6", visible: true },
        { id: "webhook", href: "/tools/webhook", label: "웹훅 테스트", desc: "요청 실시간 확인", icon: "M18 16.98h-5.99c-1.1 0-1.95.68-2.23 1.61A3 3 0 0 1 2 17c0-1.66 1.34-3 3-3h.5 M12 3C9.24 3 7 5.24 7 8c0 2.16 1.28 3.99 3.12 4.82 M17 8c0-2.76-2.24-5-5-5 M22 8c0 2.76-2.24 5-5 5h-1", visible: true },
      ],
    },
    {
      id: "website", label: "웹사이트", visible: true,
      items: [
        { id: "blog", href: "/dashboard/blog", label: "KRL Blog", desc: "slug.krl.kr 블로그 만들기", icon: "M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z", visible: true },
        { id: "subdomain", href: "/dashboard/subdomains", label: "서브도메인", desc: "내이름.krl.kr 주소 만들기", icon: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z", visible: true },
        { id: "bio", href: "/tools/bio", label: "Link-in-bio", desc: "krl.kr/@닉네임 프로필 페이지", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", visible: true },
      ],
    },
    {
      id: "dev-tools", label: "개발 도구", visible: true,
      items: [
        { id: "ip-lookup", href: "/tools/dev", label: "IP 조회", desc: "IP 주소와 지역 정보 확인", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z", visible: true },
        { id: "uuid", href: "/tools/dev", label: "UUID 생성기", desc: "랜덤 UUID v4 생성", icon: "M7 7h10v10H7z M12 3v4 M12 17v4 M3 12h4 M17 12h4", visible: true },
        { id: "hash", href: "/tools/dev", label: "Hash 계산기", desc: "SHA-256/512 해시값 계산", icon: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18", visible: true },
        { id: "base64", href: "/tools/dev", label: "Base64", desc: "Base64 인코딩/디코딩", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6", visible: true },
        { id: "dns", href: "/tools/dev", label: "DNS 조회", desc: "A/CNAME/MX/TXT 레코드 확인", icon: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8 M3 3v5h5 M12 7v5l3 3", visible: true },
        { id: "jwt", href: "/tools/dev", label: "JWT 디코드", desc: "JWT 토큰 파싱 및 확인", icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z", visible: true },
      ],
    },
  ],
  simpleLinks: [
    { id: "community", href: "/community", label: "커뮤니티", visible: true },
    { id: "ai-chat", href: "/chat", label: "AI 채팅", icon: "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z M5 14v7M19 14v7M9 14v7M15 14v7", visible: true },
  ],
  rightButtons: {
    search: { visible: true, href: "/search" },
    report: { visible: true },
    donate: { visible: true, href: "/support", label: "후원" },
  },
};

const CACHE_KEY = "headerConfig";
const CACHE_TS_KEY = "headerConfigTs";
const CACHE_TTL = 30_000; // 30s — matches API max-age

async function loadHeaderConfig(): Promise<HeaderConfig> {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    const ts = parseInt(sessionStorage.getItem(CACHE_TS_KEY) || "0");
    if (raw && Date.now() - ts < CACHE_TTL) return JSON.parse(raw);
  } catch {}
  try {
    const res = await fetch("/api/header-config");
    if (res.ok) {
      const data = await res.json();
      const cfg = data.config ?? DEFAULT_CONFIG;
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cfg));
        sessionStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      } catch {}
      return cfg;
    }
  } catch {}
  return DEFAULT_CONFIG;
}

// ─── Dropdown Components ──────────────────────────────────────────────────────

function SvgIcon({ path, path2 }: { path: string; path2?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      style={{ color: "var(--color-muted)" }}>
      {path.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
      {path2 && path2.split(" M").map((d, i) => <path key={`p2-${i}`} d={i === 0 ? d : "M" + d} />)}
    </svg>
  );
}

function DropdownMenu({ menu, onClose }: { menu: NavMenuConfig; onClose: () => void }) {
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 8px)", left: 0,
      background: "var(--color-white)", border: "1px solid var(--color-hairline)",
      borderRadius: "12px", boxShadow: "0 8px 32px rgba(20,20,19,0.12)",
      padding: "8px", minWidth: "260px", zIndex: 200,
    }}>
      {menu.items.filter(i => i.visible).map((item) => (
        <Link key={item.id} href={item.href} onClick={onClose} style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "9px 10px", borderRadius: "8px", cursor: "pointer", transition: "background 0.1s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {item.icon && (
              <div style={{ marginTop: "2px", flexShrink: 0 }}>
                <SvgIcon path={item.icon} path2={item.icon2} />
              </div>
            )}
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-ink)", marginBottom: "1px" }}>{item.label}</p>
              {item.desc && <p style={{ fontSize: "0.775rem", color: "var(--color-muted)", lineHeight: 1.3 }}>{item.desc}</p>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function NavDropdown({ menu }: { menu: NavMenuConfig }) {
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

// ─── Site Header ──────────────────────────────────────────────────────────────

export function SiteHeader() {
  const [user, setUser] = useState<User | null | "loading">("loading");
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [config, setConfig] = useState<HeaderConfig>(DEFAULT_CONFIG);
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
    loadHeaderConfig().then(setConfig);
  }, []);

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
  const rb = config.rightButtons;
  const visibleMenus = config.navMenus.filter(m => m.visible);
  const visibleLinks = config.simpleLinks.filter(l => l.visible);

  return (
    <>
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(243,240,238,0.93)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--color-hairline)",
      }}>
        <div style={{
          maxWidth: "1100px", margin: "0 auto", padding: "0 20px",
          display: "flex", alignItems: "center", height: "54px", gap: "2px",
        }}>
          {/* Logo */}
          <Link href={config.logo.href} style={{
            fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1rem",
            letterSpacing: "0.04em", color: "var(--color-ink)", textDecoration: "none",
            marginRight: "16px", flexShrink: 0,
          }}>{config.logo.text}</Link>

          {/* Desktop nav */}
          <nav className="krl-desktop-nav" style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1 }}>
            {visibleMenus.map((menu) => (
              <NavDropdown key={menu.id} menu={menu} />
            ))}

            {visibleLinks.map((link) => (
              <Link key={link.id} href={link.href} style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "6px 10px", borderRadius: "6px", fontSize: "0.875rem",
                fontWeight: 500, color: "var(--color-body)", textDecoration: "none", transition: "background 0.1s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {link.icon && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {link.icon.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
                  </svg>
                )}
                {link.label}
              </Link>
            ))}

            {isLoggedIn && (
              <Link href="/dashboard" style={{
                padding: "6px 10px", borderRadius: "6px", fontSize: "0.875rem",
                fontWeight: 500, color: "var(--color-body)", textDecoration: "none", transition: "background 0.1s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >대시보드</Link>
            )}
          </nav>

          {/* Right side */}
          <div className="krl-desktop-nav" style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {rb.search.visible && (
              <Link href={rb.search.href} title="검색" style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: "34px", height: "34px", borderRadius: "8px",
                color: "var(--color-body)", textDecoration: "none",
                transition: "background 0.1s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </Link>
            )}

            {rb.report.visible && isLoggedIn && (
              <button
                onClick={() => setReportOpen(true)}
                title="신고하기"
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: "34px", height: "34px", borderRadius: "8px",
                  color: "var(--color-body)", background: "transparent", border: "none",
                  cursor: "pointer", transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-card)"; (e.currentTarget as HTMLElement).style.color = "#DC2626"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-body)"; }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
            )}

            {rb.donate.visible && (
              <Link href={rb.donate.href} style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                padding: "5px 12px", borderRadius: "99px",
                background: "var(--color-surface-card)",
                border: "1px solid var(--color-hairline-strong)",
                color: "#c0392b", textDecoration: "none",
                fontSize: "0.8125rem", fontWeight: 600,
                transition: "all 0.15s",
              }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#FFF1F2";
                  (e.currentTarget as HTMLElement).style.borderColor = "#FECDD3";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--color-surface-card)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--color-hairline-strong)";
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M12 21.593c-.425-.439-6.593-6.408-6.593-10.093 0-3.535 2.878-6.5 6.593-6.5s6.593 2.965 6.593 6.5c0 3.685-6.168 9.654-6.593 10.093z" opacity=".3"/>
                  <path d="M12 2C7.589 2 4 5.589 4 10c0 4.766 7.078 11.485 7.38 11.77a.83.83 0 001.24 0C12.922 21.485 20 14.766 20 10c0-4.411-3.589-8-8-8zm0 12a4 4 0 110-8 4 4 0 010 8z"/>
                </svg>
                {rb.donate.label}
              </Link>
            )}

            {user === "loading" ? null : isLoggedIn ? (
              <div ref={accountRef} style={{ position: "relative" }}>
                <button onClick={() => setAccountOpen(!accountOpen)} style={{
                  display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px",
                  borderRadius: "99px", background: "var(--color-surface-card)",
                  border: "1px solid var(--color-hairline)", cursor: "pointer",
                  fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-ink)",
                  fontFamily: "var(--font-sans)",
                }}>
                  <div style={{
                    width: "22px", height: "22px", borderRadius: "50%",
                    background: "var(--color-ink)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.625rem", color: "var(--color-canvas)", fontWeight: 800,
                  }}>
                    {(user as User).email[0].toUpperCase()}
                  </div>
                  <span className="krl-account-name">
                    {(user as User).name ?? (user as User).email.split("@")[0]}
                  </span>
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
                    padding: "8px", minWidth: "190px", zIndex: 200,
                  }}>
                    <p style={{ padding: "6px 10px 4px", fontSize: "0.75rem", color: "var(--color-muted)" }}>
                      {(user as User).email}
                    </p>
                    <div style={{ height: "1px", background: "var(--color-hairline)", margin: "4px 0" }} />
                    {[
                      { href: "/dashboard", label: "대시보드", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" },
                      { href: "/dashboard/api-keys", label: "API 키", icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" },
                      { href: "/dashboard/settings", label: "설정", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
                    ].map((item) => (
                      <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "6px", fontSize: "0.875rem", fontWeight: 500, color: "var(--color-ink)", cursor: "pointer", transition: "background 0.1s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-card)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-muted)", flexShrink: 0 }}>
                            {item.icon.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
                          </svg>
                          {item.label}
                        </div>
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
                  background: "var(--color-ink)",
                  transition: "opacity 0.1s",
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
          <div style={{ borderTop: "1px solid var(--color-hairline)", background: "var(--color-white)", padding: "8px 16px 20px", maxHeight: "85vh", overflowY: "auto" }}>
            {rb.donate.visible && (
              <Link href={rb.donate.href} onClick={() => setMobileOpen(false)} style={{
                display: "flex", alignItems: "center", gap: "8px",
                margin: "8px 0 12px", padding: "12px 14px",
                background: "linear-gradient(135deg, #fff0f0 0%, #fffbf0 100%)",
                border: "1px solid rgba(255,107,107,0.25)",
                borderRadius: "10px", textDecoration: "none",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#c0392b" stroke="none">
                  <path d="M12 21.593c-.425-.439-6.593-6.408-6.593-10.093 0-3.535 2.878-6.5 6.593-6.5s6.593 2.965 6.593 6.5c0 3.685-6.168 9.654-6.593 10.093z"/>
                </svg>
                <div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "#c0392b", marginBottom: "1px" }}>{rb.donate.label}하기</p>
                  <p style={{ fontSize: "0.75rem", color: "#e57373" }}>KRL.KR 개발을 응원해주세요</p>
                </div>
              </Link>
            )}

            {visibleMenus.map((menu) => (
              <div key={menu.id}>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted)", padding: "10px 4px 4px" }}>
                  {menu.label}
                </p>
                {menu.items.filter(i => i.visible).map((item) => (
                  <Link key={item.id} href={item.href} onClick={() => setMobileOpen(false)} style={{
                    display: "flex", alignItems: "center", gap: "10px", padding: "11px 4px",
                    fontSize: "0.9375rem", fontWeight: 500, color: "var(--color-ink)", textDecoration: "none",
                    borderBottom: "1px solid var(--color-hairline)",
                  }}>
                    {item.icon && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-muted)", flexShrink: 0 }}>
                        {item.icon.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
                        {item.icon2 && item.icon2.split(" M").map((d, i) => <path key={`p2-${i}`} d={i === 0 ? d : "M" + d} />)}
                      </svg>
                    )}
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}

            <div style={{ height: "1px", background: "var(--color-hairline)", margin: "8px 0" }} />

            {visibleLinks.map((link) => (
              <Link key={link.id} href={link.href} onClick={() => setMobileOpen(false)} style={{
                display: "block", padding: "11px 4px", fontSize: "0.9375rem",
                fontWeight: 500, color: "var(--color-ink)", textDecoration: "none",
                borderBottom: "1px solid var(--color-hairline)",
              }}>{link.label}</Link>
            ))}

            {rb.search.visible && (
              <Link href={rb.search.href} onClick={() => setMobileOpen(false)} style={{
                display: "block", padding: "11px 4px", fontSize: "0.9375rem",
                fontWeight: 500, color: "var(--color-ink)", textDecoration: "none",
                borderBottom: "1px solid var(--color-hairline)",
              }}>검색</Link>
            )}

            {rb.report.visible && isLoggedIn && (
              <button onClick={() => { setMobileOpen(false); setReportOpen(true); }} style={{
                display: "flex", alignItems: "center", gap: "8px",
                width: "100%", padding: "11px 4px", background: "none", border: "none",
                textAlign: "left", fontSize: "0.9375rem", fontWeight: 500, color: "#DC2626",
                cursor: "pointer", fontFamily: "var(--font-sans)",
                borderBottom: "1px solid var(--color-hairline)",
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                신고하기
              </button>
            )}

            {isLoggedIn ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} style={{ display: "block", padding: "11px 4px", fontSize: "0.9375rem", fontWeight: 500, color: "var(--color-ink)", textDecoration: "none", borderBottom: "1px solid var(--color-hairline)" }}>대시보드</Link>
                <Link href="/dashboard/api-keys" onClick={() => setMobileOpen(false)} style={{ display: "block", padding: "11px 4px", fontSize: "0.9375rem", fontWeight: 500, color: "var(--color-ink)", textDecoration: "none", borderBottom: "1px solid var(--color-hairline)" }}>API 키</Link>
                <Link href="/dashboard/settings" onClick={() => setMobileOpen(false)} style={{ display: "block", padding: "11px 4px", fontSize: "0.9375rem", fontWeight: 500, color: "var(--color-ink)", textDecoration: "none", borderBottom: "1px solid var(--color-hairline)" }}>설정</Link>
                <button onClick={handleLogout} style={{ display: "block", width: "100%", padding: "11px 4px", background: "none", border: "none", textAlign: "left", fontSize: "0.9375rem", fontWeight: 500, color: "#DC2626", cursor: "pointer", fontFamily: "var(--font-sans)", borderBottom: "1px solid var(--color-hairline)" }}>로그아웃</button>
              </>
            ) : (
              <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                <Link href="/login" style={{ display: "block", flex: 1, padding: "11px", textAlign: "center", border: "1px solid var(--color-hairline)", borderRadius: "8px", fontSize: "0.9375rem", fontWeight: 500, color: "var(--color-ink)", textDecoration: "none" }}>로그인</Link>
                <Link href="/register" style={{ display: "block", flex: 1, padding: "11px", textAlign: "center", background: "var(--color-ink)", borderRadius: "8px", fontSize: "0.9375rem", fontWeight: 600, color: "var(--color-canvas)", textDecoration: "none" }}>회원가입</Link>
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
        @media (max-width: 900px) {
          .krl-account-name { display: none; }
        }
      `}</style>

      {reportOpen && <ReportModal onClose={() => setReportOpen(false)} />}
    </>
  );
}
