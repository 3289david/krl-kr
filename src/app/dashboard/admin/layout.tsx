"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  {
    href: "/dashboard/admin",
    label: "개요",
    icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  },
  {
    href: "/dashboard/admin/users",
    label: "사용자 관리",
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    href: "/dashboard/admin/admins",
    label: "관리자 설정",
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  },
  {
    href: "/dashboard/admin/notices",
    label: "공지 관리",
    icon: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  },
  {
    href: "/dashboard/admin/chat",
    label: "지원 채팅",
    icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  },
  {
    href: "/dashboard/admin/meetings",
    label: "관리자 회의",
    icon: "M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminInfo, setAdminInfo] = useState<{ isAdmin: boolean; isMaster: boolean; role: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((d) => {
        setAdminInfo(d);
        if (!d.isAdmin) router.replace("/dashboard");
      })
      .catch(() => router.replace("/dashboard"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px", color: "var(--color-muted)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite", marginRight: "8px" }}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        확인 중...
      </div>
    );
  }

  if (!adminInfo?.isAdmin) return null;

  const isActive = (href: string) =>
    href === "/dashboard/admin" ? pathname === href : pathname.startsWith(href);

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
      {/* Sidebar */}
      <aside style={{
        width: "220px", flexShrink: 0,
        borderRight: "1px solid var(--color-hairline)",
        padding: "24px 0",
        background: "var(--color-lifted)",
      }}>
        {/* Admin badge */}
        <div style={{ padding: "0 16px 20px", borderBottom: "1px solid var(--color-hairline)", marginBottom: "12px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "4px 10px", borderRadius: "var(--radius-pill)",
            background: adminInfo.isMaster ? "var(--color-ink)" : "var(--color-surface-card)",
            color: adminInfo.isMaster ? "var(--color-canvas)" : "var(--color-ink)",
            fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.03em",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            {adminInfo.isMaster ? "마스터 관리자" : "관리자"}
          </div>
        </div>

        {NAV.filter((item) => {
          if (item.href === "/dashboard/admin/admins" && !adminInfo.isMaster) return false;
          return true;
        }).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 16px", fontSize: "0.875rem", fontWeight: 500,
              textDecoration: "none", transition: "background 0.1s",
              color: isActive(item.href) ? "var(--color-ink)" : "var(--color-muted)",
              background: isActive(item.href) ? "var(--color-surface-card)" : "transparent",
              borderRadius: "var(--radius-md)",
              margin: "1px 8px",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              {item.icon.split(" M").map((d, i) => (
                <path key={i} d={i === 0 ? d : "M" + d} />
              ))}
            </svg>
            {item.label}
          </Link>
        ))}

        <div style={{ borderTop: "1px solid var(--color-hairline)", margin: "12px 8px 0", paddingTop: "12px" }}>
          <Link
            href="/dashboard"
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 16px", fontSize: "0.875rem", fontWeight: 500,
              textDecoration: "none", color: "var(--color-muted)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            대시보드로
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}
