import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "커뮤니티 | KRL.KR",
};

export default async function CommunityPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: _ } = await params;
  return (
    <main style={{ minHeight: "80vh", background: "var(--color-canvas)" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px", fontSize: "0.875rem", color: "var(--color-muted)" }}>
          <Link href="/community" style={{ color: "var(--color-muted)", textDecoration: "none" }}>커뮤니티</Link>
          <span>›</span>
          <span>게시글</span>
        </div>

        <div style={{
          background: "var(--color-lifted)",
          border: "1px solid var(--color-hairline)",
          borderRadius: "16px",
          padding: "48px 40px",
          textAlign: "center",
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-ash)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 20px" }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "12px" }}>
            커뮤니티 게시판 준비 중
          </h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem", marginBottom: "28px", lineHeight: 1.6 }}>
            아직 게시글이 없거나 해당 게시글을 찾을 수 없습니다.<br />
            곧 커뮤니티 기능이 정식으로 오픈될 예정입니다.
          </p>
          <Link href="/community" style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "10px 20px", borderRadius: "9999px",
            background: "var(--color-ink)", color: "var(--color-canvas)",
            textDecoration: "none", fontSize: "0.875rem", fontWeight: 600,
          }}>
            ← 커뮤니티로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
