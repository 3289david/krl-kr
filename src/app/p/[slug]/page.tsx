import { notFound } from "next/navigation";
import { getDB } from "@/lib/env";
import { formatDate } from "@/lib/utils";

function toMs(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return isNaN(v) ? null : v;
  if (typeof v === "string") {
    const s = v.trim();
    if (/^\d+$/.test(s)) return Number(s);
    const t = new Date(s).getTime();
    return isNaN(t) ? null : t;
  }
  return null;
}

interface Paste {
  id: string;
  slug: string;
  title: string | null;
  content: string;
  language: string;
  is_public: number;
  view_count: number;
  created_at: string;
  expires_at: string | null;
}

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ p?: string }>;
}

export default async function PasteViewPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { p: password } = await searchParams;

  const db = getDB();
  if (!db) {
    return (
      <main>
        <section className="section">
          <div className="container" style={{ maxWidth: "720px", textAlign: "center" }}>
            <p style={{ color: "var(--color-danger)" }}>서비스를 일시적으로 사용할 수 없습니다.</p>
          </div>
        </section>
      </main>
    );
  }

  const paste = await db.prepare("SELECT * FROM pastes WHERE slug = ?").bind(slug).first<Paste>();
  if (!paste) notFound();

  // Check expiry — handle numeric ms strings from D1
  const expiresMs = toMs(paste.expires_at);
  if (expiresMs && expiresMs < Date.now()) {
    return (
      <main>
        <section className="section">
          <div className="container" style={{ maxWidth: "480px", textAlign: "center" }}>
            <h1 style={{ marginBottom: "16px" }}>만료된 페이스트</h1>
            <p style={{ color: "var(--color-muted)" }}>이 페이스트는 만료되어 더 이상 볼 수 없습니다.</p>
          </div>
        </section>
      </main>
    );
  }

  // Check password
  if (paste.is_public === 0 && !password) {
    return (
      <main>
        <section className="section">
          <div className="container" style={{ maxWidth: "400px", textAlign: "center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-ash)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 20px" }}>
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h1 style={{ marginBottom: "12px" }}>비공개 페이스트</h1>
            <p style={{ color: "var(--color-muted)", marginBottom: "24px" }}>이 페이스트는 비공개입니다.</p>
            <a href="/" className="btn btn-secondary btn-pill" style={{ textDecoration: "none" }}>홈으로</a>
          </div>
        </section>
      </main>
    );
  }

  // Increment view count
  await db.prepare("UPDATE pastes SET view_count = view_count + 1 WHERE id = ?").bind(paste.id).run();

  const lineCount = paste.content.split("\n").length;

  return (
    <main>
      <section className="section" style={{ paddingBottom: "32px" }}>
        <div className="container" style={{ maxWidth: "900px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
            <div>
              <h1 style={{ fontSize: "1.5rem", marginBottom: "8px" }}>
                {paste.title || "제목 없음"}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <span className="badge">{paste.language}</span>
                <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{lineCount}줄</span>
                <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>조회 {paste.view_count.toLocaleString("ko-KR")}회</span>
                <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                  {formatDate(paste.created_at)}
                </span>
              </div>
            </div>
            <a
              href={`/tools/paste`}
              className="btn btn-secondary btn-pill"
              style={{ textDecoration: "none", flexShrink: 0 }}
            >
              새 페이스트
            </a>
          </div>

          <div style={{ background: "var(--color-surface-dark)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                  <div key={c} style={{ width: "12px", height: "12px", borderRadius: "50%", background: c }} />
                ))}
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "rgba(243,240,238,0.4)" }}>
                {paste.title || "paste"} · {paste.language}
              </span>
            </div>
            <div style={{ display: "flex", overflowX: "auto" }}>
              <div style={{ padding: "20px 0", borderRight: "1px solid rgba(255,255,255,0.08)", userSelect: "none", flexShrink: 0 }}>
                {paste.content.split("\n").map((_, i) => (
                  <div key={i} style={{ padding: "0 16px", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", lineHeight: "1.6", color: "rgba(243,240,238,0.25)", textAlign: "right", minWidth: "40px" }}>
                    {i + 1}
                  </div>
                ))}
              </div>
              <pre style={{ padding: "20px 24px", margin: 0, fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--color-canvas)", lineHeight: 1.6, overflowX: "visible", whiteSpace: "pre" }}>
                {paste.content}
              </pre>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
