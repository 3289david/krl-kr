import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "커뮤니티 | KRL.KR",
  description: "KRL.KR 사용자 커뮤니티 — 공지사항, 자유게시판, 기능 제안",
};

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      border: "1px solid var(--color-hairline)", borderRadius: "10px",
      padding: "48px 24px", textAlign: "center",
      color: "var(--color-muted)", fontSize: "0.875rem",
      background: "var(--color-white)",
    }}>
      {message}
    </div>
  );
}

export default function CommunityPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--color-canvas)" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px 64px" }}>

        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "40px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.025em", marginBottom: "6px" }}>커뮤니티</h1>
            <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>KRL.KR 사용자 게시판 — 공지, 자유 게시판, 기능 제안</p>
          </div>
          <Link href="/login" style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "8px 16px", borderRadius: "6px", background: "var(--color-ink)",
            color: "var(--color-canvas)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            글쓰기
          </Link>
        </div>

        {/* 공지사항 */}
        <section style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-ink)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--color-muted)" }}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                공지사항
              </span>
            </h2>
            <Link href="/community/notices" style={{ fontSize: "0.8125rem", color: "var(--color-muted)", textDecoration: "none" }}>전체보기</Link>
          </div>
          <EmptyState message="아직 공지사항이 없습니다." />
        </section>

        {/* 자유게시판 */}
        <section style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-ink)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--color-muted)" }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                자유게시판
              </span>
            </h2>
            <Link href="/community/board" style={{ fontSize: "0.8125rem", color: "var(--color-muted)", textDecoration: "none" }}>전체보기</Link>
          </div>
          <EmptyState message="아직 게시물이 없습니다." />
        </section>

        {/* 기능 제안 */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-ink)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--color-muted)" }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                기능 제안
              </span>
            </h2>
            <Link href="/community/requests" style={{ fontSize: "0.8125rem", color: "var(--color-muted)", textDecoration: "none" }}>전체보기</Link>
          </div>
          <EmptyState message="아직 기능 제안이 없습니다." />
        </section>
      </div>
    </main>
  );
}
