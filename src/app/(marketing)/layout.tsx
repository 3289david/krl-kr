import { SiteHeader } from "@/components/layout/site-header";
import { Footer } from "@/components/marketing/footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <Footer />
    </>
  );
}
