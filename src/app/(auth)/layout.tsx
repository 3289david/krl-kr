import { SiteHeader } from "@/components/layout/site-header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-canvas)", fontFamily: "var(--font-sans)" }}>
      <SiteHeader />
      {children}
    </div>
  );
}
