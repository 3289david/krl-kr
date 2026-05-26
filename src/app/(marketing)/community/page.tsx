import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "커뮤니티 | KRL.KR",
  description: "KRL.KR 사용자 커뮤니티 — 공지사항, 자유게시판, 기능 제안",
};

const NOTICES = [
  { id: 1, title: "KRL.KR 서비스 오픈 안내", date: "2026-05-26", views: 1024 },
  { id: 2, title: "이메일 수신함 기능 추가 안내", date: "2026-05-20", views: 342 },
  { id: 3, title: "서브도메인 서비스 신청 방법", date: "2026-05-15", views: 891 },
];

const FREE_BOARD = [
  { id: 10, title: "링크 만들어봤는데 진짜 빠르네요", author: "익명", date: "2026-05-26", views: 88, replies: 3 },
  { id: 11, title: "서브도메인 신청했는데 얼마나 걸리나요?", author: "사용자123", date: "2026-05-25", views: 62, replies: 5 },
  { id: 12, title: "QR 코드 로고 삽입 언제 되나요", author: "홍길동", date: "2026-05-24", views: 143, replies: 2 },
  { id: 13, title: "API 사용해서 디스코드봇 만들었습니다", author: "개발자", date: "2026-05-23", views: 287, replies: 11 },
  { id: 14, title: "파일 공유 링크 만료 기간 설정 어떻게 하나요", author: "익명", date: "2026-05-22", views: 54, replies: 1 },
];

const FEATURE_REQUESTS = [
  { id: 20, title: "링크 폴더/그룹 기능 추가 요청", author: "요청자", date: "2026-05-24", votes: 47, replies: 8 },
  { id: 21, title: "Link-in-bio 다크 테마 추가", author: "디자이너", date: "2026-05-22", votes: 33, replies: 4 },
  { id: 22, title: "이메일 별칭 여러 개 만들기", author: "사용자", date: "2026-05-21", votes: 28, replies: 6 },
  { id: 23, title: "QR 코드 배치 다운로드", author: "마케터", date: "2026-05-19", votes: 19, replies: 2 },
];

function BoardTable({ rows, type }: {
  rows: Array<{ id: number; title: string; author?: string; date: string; views?: number; replies?: number; votes?: number }>;
  type: "notice" | "free" | "request";
}) {
  return (
    <div style={{ border: "1px solid var(--color-hairline)", borderRadius: "10px", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--color-lifted)", borderBottom: "1px solid var(--color-hairline)" }}>
            <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-muted)", width: type === "notice" ? "60%" : "50%" }}>제목</th>
            {type !== "notice" && <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-muted)", width: "12%" }}>글쓴이</th>}
            <th style={{ padding: "10px 16px", textAlign: "right", fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-muted)", width: "14%" }}>날짜</th>
            {type === "request"
              ? <th style={{ padding: "10px 16px", textAlign: "right", fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-muted)", width: "10%" }}>추천</th>
              : <th style={{ padding: "10px 16px", textAlign: "right", fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-muted)", width: "10%" }}>조회</th>}
            {type !== "notice" && <th style={{ padding: "10px 16px", textAlign: "right", fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-muted)", width: "8%" }}>댓글</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--color-hairline)" : "none", background: "var(--color-white)" }}>
              <td style={{ padding: "12px 16px" }}>
                <Link href={`/community/${row.id}`} style={{
                  fontSize: "0.9rem", fontWeight: 500, color: "var(--color-ink)", textDecoration: "none",
                }}>
                  {row.title}
                </Link>
              </td>
              {type !== "notice" && <td style={{ padding: "12px 16px", fontSize: "0.8125rem", color: "var(--color-muted)" }}>{row.author}</td>}
              <td style={{ padding: "12px 16px", fontSize: "0.8125rem", color: "var(--color-muted)", textAlign: "right", whiteSpace: "nowrap" }}>{row.date?.slice(5)}</td>
              {type === "request"
                ? <td style={{ padding: "12px 16px", fontSize: "0.8125rem", color: "var(--color-muted)", textAlign: "right", fontWeight: 600 }}>{row.votes}</td>
                : <td style={{ padding: "12px 16px", fontSize: "0.8125rem", color: "var(--color-muted)", textAlign: "right" }}>{row.views}</td>}
              {type !== "notice" && <td style={{ padding: "12px 16px", fontSize: "0.8125rem", color: "var(--color-muted)", textAlign: "right" }}>{row.replies}</td>}
            </tr>
          ))}
        </tbody>
      </table>
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
          <BoardTable rows={NOTICES} type="notice" />
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
          <BoardTable rows={FREE_BOARD} type="free" />
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
          <BoardTable rows={FEATURE_REQUESTS} type="request" />
        </section>
      </div>
    </main>
  );
}
