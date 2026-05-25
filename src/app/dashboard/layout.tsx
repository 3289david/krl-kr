import Link from "next/link";
import {
  HomeIcon, LinkIcon, BarChartIcon, QrCodeIcon,
  SettingsIcon, KeyIcon, FileIcon, CodeIcon, WebhookIcon, UserIcon, GlobeIcon, EmailIcon
} from "@/components/icons";

function SidebarLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="sidebar-link" style={{ textDecoration: "none" }}>
      <span style={{ color: "var(--color-muted)", flexShrink: 0 }}>{icon}</span>
      {label}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      background: "var(--color-canvas)", fontFamily: "var(--font-sans)",
    }}>
      {/* Sidebar */}
      <aside style={{
        width: "240px", flexShrink: 0,
        background: "var(--color-lifted)", borderRight: "1px solid var(--color-hairline)",
        padding: "20px 12px", display: "flex", flexDirection: "column",
        gap: "4px", position: "sticky", top: 0, height: "100vh", overflowY: "auto",
      }}>
        <Link href="/" style={{
          fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1rem",
          letterSpacing: "0.04em", color: "var(--color-ink)", textDecoration: "none",
          padding: "8px 12px", marginBottom: "8px",
        }}>
          KRL.KR
        </Link>

        <div style={{ height: "1px", background: "var(--color-hairline)", margin: "4px 0 8px" }} />

        <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-ash)", padding: "4px 12px", marginBottom: "4px" }}>
          메인
        </p>

        <SidebarLink href="/dashboard" icon={<HomeIcon size={17} />} label="대시보드" />
        <SidebarLink href="/dashboard/links" icon={<LinkIcon size={17} />} label="링크 관리" />
        <SidebarLink href="/dashboard/qr" icon={<QrCodeIcon size={17} />} label="QR 코드" />

        <div style={{ height: "1px", background: "var(--color-hairline)", margin: "8px 0" }} />

        <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-ash)", padding: "4px 12px", marginBottom: "4px" }}>
          도구
        </p>

        <SidebarLink href="/dashboard/files" icon={<FileIcon size={17} />} label="파일 공유" />
        <SidebarLink href="/dashboard/paste" icon={<CodeIcon size={17} />} label="Pastebin" />
        <SidebarLink href="/dashboard/webhook" icon={<WebhookIcon size={17} />} label="웹훅 검사" />
        <SidebarLink href="/dashboard/bio" icon={<UserIcon size={17} />} label="Link-in-bio" />
        <SidebarLink href="/dashboard/subdomains" icon={<GlobeIcon size={17} />} label="서브도메인" />
        <SidebarLink href="/dashboard/email" icon={<EmailIcon size={17} />} label="받은 편지함" />

        <div style={{ height: "1px", background: "var(--color-hairline)", margin: "8px 0" }} />

        <SidebarLink href="/dashboard/api-keys" icon={<KeyIcon size={17} />} label="API 키" />
        <SidebarLink href="/dashboard/settings" icon={<SettingsIcon size={17} />} label="설정" />
        <SidebarLink href="/api/auth/logout" icon={<BarChartIcon size={17} />} label="로그아웃" />

        <div style={{ flex: 1 }} />
      </aside>

      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}
