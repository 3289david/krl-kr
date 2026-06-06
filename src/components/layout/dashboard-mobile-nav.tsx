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
    href: "/dashboard/links",
    label: "링크",
    icon: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  },
  {
    href: "/dashboard/qr",
    label: "QR",
    icon: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h4 M18 14v4 M14 18h4 M18 18v4",
  },
  {
    href: "/dashboard/bio",
    label: "Bio",
    icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  },
  {
    href: "/dashboard/blog",
    label: "블로그",
    icon: "M12 20h9 M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
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
