"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/links", label: "내 링크" },
  { href: "/dashboard/qr", label: "QR 코드" },
  { href: "/dashboard/files", label: "파일 공유" },
  { href: "/dashboard/paste", label: "코드 공유" },
  { href: "/dashboard/webhook", label: "웹훅" },
  { href: "/dashboard/bio", label: "Link-in-bio" },
  { href: "/dashboard/subdomains", label: "서브도메인" },
  { href: "/dashboard/email", label: "받은 메일" },
  { href: "/dashboard/api-keys", label: "API 키" },
  { href: "/dashboard/settings", label: "설정" },
];

export function DashboardTabs() {
  const pathname = usePathname();

  return (
    <div style={{
      borderBottom: "1px solid var(--color-hairline)",
      background: "var(--color-lifted)",
      overflowX: "auto",
    }}>
      <div style={{
        maxWidth: "1100px", margin: "0 auto", padding: "0 24px",
        display: "flex", gap: "0",
      }}>
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: "inline-block",
                padding: "11px 14px",
                fontSize: "0.875rem",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--color-ink)" : "var(--color-muted)",
                textDecoration: "none",
                borderBottom: isActive ? "2px solid var(--color-ink)" : "2px solid transparent",
                whiteSpace: "nowrap",
                transition: "color 0.1s",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
