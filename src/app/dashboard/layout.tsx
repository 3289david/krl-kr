import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SiteHeader } from "@/components/layout/site-header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Server-side auth guard
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-canvas)", fontFamily: "var(--font-sans)" }}>
      <SiteHeader />
      <div className="dashboard-outer" style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 0" }}>
        {children}
      </div>
    </div>
  );
}
