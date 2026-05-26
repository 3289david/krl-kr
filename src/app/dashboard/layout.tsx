import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SiteHeader } from "@/components/layout/site-header";
import { DashboardTabs } from "@/components/layout/dashboard-tabs";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Server-side auth guard
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-canvas)", fontFamily: "var(--font-sans)" }}>
      <SiteHeader />
      <DashboardTabs />
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>
        {children}
      </div>
    </div>
  );
}
