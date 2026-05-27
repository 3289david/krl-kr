import { SiteHeader } from "@/components/layout/site-header";
import { Footer } from "@/components/marketing/footer";

export default function QRLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <Footer />
    </>
  );
}
