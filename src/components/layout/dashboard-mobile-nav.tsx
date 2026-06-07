"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "홈",
    icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
    exact: true,
  },
  {
    href: "/dashboard/chat",
    label: "채팅",
    icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  },
  {
    href: "/dashboard/drive",
    label: "드라이브",
    icon: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  },
  {
    href: "/dashboard/voice",
    label: "보이스",
    icon: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4 M8 23h8",
  },
  {
    href: "/dashboard/settings",
    label: "설정",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  },
];

export function DashboardMobileNav() {
  const pathname = usePathname();

  function isActive(item: typeof NAV_ITEMS[0]) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <nav className="dashboard-mobile-nav" style={{
      display: "none", // shown via CSS @media
      position: "fixed",
      bottom: 0, left: 0, right: 0,
      background: "rgba(243,240,238,0.95)",
      backdropFilter: "blur(12px)",
      borderTop: "1px solid var(--color-hairline)",
      zIndex: 90,
      paddingBottom: "env(safe-area-inset-bottom, 0)",
    }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link key={item.href} href={item.href} style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
              padding: "10px 4px",
              textDecoration: "none",
              color: active ? "var(--color-ink)" : "var(--color-muted)",
              fontFamily: "var(--font-sans)",
              fontSize: "0.6875rem",
              fontWeight: active ? 600 : 400,
              transition: "color 0.1s",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={active ? 2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dashboard-mobile-nav { display: block !important; }
          .dashboard-outer { padding-bottom: 80px !important; }
        }
      `}</style>
    </nav>
  );
}
