import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

// IDE page overrides the dashboard layout — full height, no max-width container
export default async function IDELayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div style={{ height: "100vh", overflow: "hidden", background: "var(--color-canvas)", fontFamily: "var(--font-sans)" }}>
      {children}
    </div>
  );
}
