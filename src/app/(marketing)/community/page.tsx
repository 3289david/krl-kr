import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { formatRelativeTime } from "@/lib/utils";
import { getDB } from "@/lib/env";
import { getPool } from "@/lib/db/postgres";

export const metadata: Metadata = {
  title: "커뮤니티 | KRL.KR",
  description: "KRL.KR 사용자 커뮤니티 — 공지사항, 자유게시판, 기능 제안",
};

const BOARD_META: Record<string, { label: string; icon: string; color: string }> = {
  notice:  { label: "공지사항", icon: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0", color: "#ef4444" },
  free:    { label: "자유게시판", icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z", color: "#3b82f6" },
  feature: { label: "기능 제안", icon: "M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3", color: "#8b5cf6" },
};

function toNum(v: unknown) { return v != null ? Number(v) : 0; }

interface AdminNotice {
  id: number; title: string; content: string; notice_type: string; pinned: number; created_at: number;
}

async function fetchAdminNotices(allVisible = false): Promise<AdminNotice[]> {
  try {
    const pool = getPool();
    const result = await pool.query(
      allVisible
        ? `SELECT id, title, content, notice_type, pinned, created_at
           FROM notices
           ORDER BY pinned DESC, created_at DESC LIMIT 100`
        : `SELECT id, title, content, notice_type, pinned, created_at
           FROM notices
           WHERE visible = 1
           ORDER BY pinned DESC, created_at DESC LIMIT 10`
    );
    return result.rows as AdminNotice[];
  } catch {
    return [];
  }
}

const NOTICE_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  notice:  { label: "공지",    color: "#1d4ed8", bg: "#EFF6FF" },
  update:  { label: "업데이트", color: "#059669", bg: "#ECFDF5" },
  legal:   { label: "법적고지", color: "#DC2626", bg: "#FEF2F2" },
  event:   { label: "이벤트",  color: "#7C3AED", bg: "#F5F3FF" },
};

async function fetchBoardPosts(board: string) {
  try {
    const db = getDB();
    const result = await db
      .prepare(
        `SELECT p.id, p.title, p.view_count, p.like_count, p.comment_count, p.is_pinned, p.created_at,
                u.name AS author_name, u.email AS author_email
         FROM community_posts p JOIN users u ON u.id = p.user_id
         WHERE p.board = ? AND p.is_deleted = 0
         ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT 5`
      )
      .bind(board)
      .all<Record<string, unknown>>();
    return result.results;
  } catch {
    return [];
  }
}

interface Post {
  id: unknown;
  title: unknown;
  view_count: unknown;
  like_count: unknown;
  comment_count: unknown;
  is_pinned: unknown;
  created_at: unknown;
  author_name: unknown;
  author_email: unknown;
}

function PostRow({ post }: { post: Post }) {
  return (
    <Link href={`/community/${post.id}`} className="community-post-row" style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "11px 18px", textDecoration: "none", gap: "12px",
      borderBottom: "1px solid var(--color-hairline)",
    }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
        {Boolean(post.is_pinned) && (
          <span style={{
            fontSize: "0.6875rem", fontWeight: 700, color: "#ef4444",
            background: "#FFF1F2", border: "1px solid #FECDD3",
            borderRadius: "4px", padding: "1px 5px", flexShrink: 0,
          }}>고정</span>
        )}
        <span style={{
          fontSize: "0.875rem", color: "var(--color-ink)", fontWeight: 500,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {post.title as string}
        </span>
        {toNum(post.comment_count) > 0 && (
          <span style={{ fontSize: "0.75rem", color: "var(--color-arc)", fontWeight: 600, flexShrink: 0 }}>
            [{toNum(post.comment_count)}]
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
          {(post.author_name as string) || (post.author_email as string).split("@")[0]}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--color-ash)" }}>
          {formatRelativeTime(toNum(post.created_at))}
        </span>
      </div>
    </Link>
  );
}

function BoardCard({ board, posts }: { board: string; posts: Post[] }) {
  const meta = BOARD_META[board];
  return (
    <div style={{
      background: "var(--color-lifted)",
      border: "1px solid var(--color-hairline)",
      borderRadius: "12px", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "13px 18px", borderBottom: "1px solid var(--color-hairline)",
        background: "var(--color-white)",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "0.9rem", fontWeight: 700, color: "var(--color-ink)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={meta.icon} />
          </svg>
          {meta.label}
        </span>
        <Link href={`/community?board=${board}`} style={{ fontSize: "0.75rem", color: "var(--color-muted)", textDecoration: "none", fontWeight: 500 }}>
          전체보기 →
        </Link>
      </div>
      {posts.length === 0 ? (
        <div style={{ padding: "28px 18px", textAlign: "center", color: "var(--color-muted)", fontSize: "0.8125rem" }}>
          아직 게시물이 없습니다.
        </div>
      ) : (
        <div>
          {posts.map((p) => <PostRow key={p.id as string} post={p} />)}
        </div>
      )}
    </div>
  );
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const { board: boardParam } = await searchParams;
  const session = await getSession();

  // If a specific board is selected, show full board view
  const activeBoard = boardParam && ["notice", "free", "feature"].includes(boardParam) ? boardParam : null;

  if (activeBoard) {
    const db = getDB();
    const [postsResult, boardAdminNotices] = await Promise.all([
      db
        .prepare(
          `SELECT p.id, p.title, p.view_count, p.like_count, p.comment_count, p.is_pinned, p.created_at,
                  u.name AS author_name, u.email AS author_email
           FROM community_posts p JOIN users u ON u.id = p.user_id
           WHERE p.board = ? AND p.is_deleted = 0
           ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT 50`
        )
        .bind(activeBoard)
        .all<Record<string, unknown>>(),
      activeBoard === "notice" ? fetchAdminNotices(true) : Promise.resolve([]),
    ]);

    const meta = BOARD_META[activeBoard];

    return (
      <main style={{ minHeight: "100vh", background: "var(--color-canvas)" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 24px 80px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px", fontSize: "0.875rem", color: "var(--color-muted)" }}>
            <Link href="/community" style={{ color: "var(--color-muted)", textDecoration: "none" }}>커뮤니티</Link>
            <span>›</span>
            <span>{meta.label}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em" }}>{meta.label}</h1>
            {session && activeBoard !== "notice" && (
              <Link href={`/community/new?board=${activeBoard}`} style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "8px 16px", borderRadius: "8px",
                background: "var(--color-ink)", color: "var(--color-canvas)",
                textDecoration: "none", fontSize: "0.875rem", fontWeight: 600,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                글쓰기
              </Link>
            )}
            {!session && activeBoard !== "notice" && (
              <Link href={`/login?redirect=/community/new?board=${activeBoard}`} style={{
                padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--color-hairline-strong)",
                textDecoration: "none", fontSize: "0.875rem", color: "var(--color-muted)", fontWeight: 500,
              }}>로그인 후 글쓰기</Link>
            )}
          </div>

          {/* Admin notices shown in board view (all notices, including hidden) */}
          {boardAdminNotices.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {boardAdminNotices.map((n) => {
                const nm = NOTICE_TYPE_META[n.notice_type] ?? NOTICE_TYPE_META.notice;
                return (
                  <div key={`admin-${n.id}`} style={{
                    background: nm.bg, border: `1px solid ${nm.color}30`,
                    borderLeft: `3px solid ${nm.color}`, borderRadius: "8px",
                    padding: "12px 16px", display: "flex", gap: "12px", alignItems: "flex-start",
                  }}>
                    <div style={{ flexShrink: 0, marginTop: "1px" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={nm.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px", flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: "0.65rem", fontWeight: 700, padding: "1px 7px",
                          borderRadius: "4px", background: nm.color + "18",
                          color: nm.color, textTransform: "uppercase", letterSpacing: "0.04em",
                        }}>{nm.label}</span>
                        {n.pinned === 1 && <span style={{ fontSize: "0.65rem", fontWeight: 700, color: nm.color }}>고정</span>}
                        <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#111" }}>{n.title}</span>
                      </div>
                      <p style={{ fontSize: "0.8125rem", color: "#555", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{n.content}</p>
                      <p style={{ fontSize: "0.7rem", color: "#999", marginTop: "4px" }}>
                        {new Date(Number(n.created_at)).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "12px", overflow: "hidden" }}>
            {postsResult.results.length === 0 && boardAdminNotices.length === 0 ? (
              <div style={{ padding: "60px 24px", textAlign: "center" }}>
                <p style={{ fontWeight: 600, marginBottom: "8px" }}>아직 게시물이 없습니다</p>
                <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>첫 번째 글을 작성해보세요!</p>
              </div>
            ) : postsResult.results.length === 0 ? (
              <div style={{ padding: "28px 24px", textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem" }}>
                커뮤니티 게시글이 없습니다.
              </div>
            ) : (
              postsResult.results.map((p) => (
                <PostRow key={p.id as string} post={p as unknown as Post} />
              ))
            )}
          </div>
        </div>
      </main>
    );
  }

  // Main community page — show all boards
  const [noticePosts, freePosts, featurePosts, adminNotices] = await Promise.all([
    fetchBoardPosts("notice"),
    fetchBoardPosts("free"),
    fetchBoardPosts("feature"),
    fetchAdminNotices(),
  ]);

  return (
    <main style={{ minHeight: "100vh", background: "var(--color-canvas)" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.025em", marginBottom: "6px" }}>커뮤니티</h1>
            <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>KRL.KR 사용자 게시판</p>
          </div>
          {session ? (
            <Link href="/community/new" style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "9px 18px", borderRadius: "8px", background: "var(--color-ink)",
              color: "var(--color-canvas)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              글쓰기
            </Link>
          ) : (
            <Link href="/login?redirect=/community" style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "9px 18px", borderRadius: "8px",
              border: "1px solid var(--color-hairline-strong)",
              textDecoration: "none", fontSize: "0.875rem", color: "var(--color-body)", fontWeight: 500,
            }}>
              로그인 후 글쓰기
            </Link>
          )}
        </div>

        {/* Board tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          {Object.entries(BOARD_META).map(([key, meta]) => (
            <Link key={key} href={`/community?board=${key}`} style={{
              padding: "6px 14px", borderRadius: "99px",
              border: "1px solid var(--color-hairline-strong)",
              background: "var(--color-lifted)",
              textDecoration: "none", fontSize: "0.8125rem",
              fontWeight: 500, color: "var(--color-body)",
            }}>
              {meta.label}
            </Link>
          ))}
        </div>

        {/* Admin Notices section */}
        {adminNotices.length > 0 && (
          <div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {adminNotices.map((n) => {
              const meta = NOTICE_TYPE_META[n.notice_type] ?? NOTICE_TYPE_META.notice;
              return (
                <div key={n.id} style={{
                  background: meta.bg,
                  border: `1px solid ${meta.color}30`,
                  borderLeft: `3px solid ${meta.color}`,
                  borderRadius: "8px",
                  padding: "12px 16px",
                  display: "flex", gap: "12px", alignItems: "flex-start",
                }}>
                  <div style={{ flexShrink: 0, marginTop: "1px" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px", flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: "0.65rem", fontWeight: 700, padding: "1px 7px",
                        borderRadius: "4px", background: meta.color + "18",
                        color: meta.color, textTransform: "uppercase", letterSpacing: "0.04em",
                      }}>{meta.label}</span>
                      {n.pinned === 1 && (
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: meta.color }}>고정</span>
                      )}
                      <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#111" }}>{n.title}</span>
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "#555", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{n.content}</p>
                    <p style={{ fontSize: "0.7rem", color: "#999", marginTop: "4px" }}>
                      {new Date(Number(n.created_at)).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
          <BoardCard board="notice" posts={noticePosts as unknown as Post[]} />
          <BoardCard board="free" posts={freePosts as unknown as Post[]} />
          <BoardCard board="feature" posts={featurePosts as unknown as Post[]} />
        </div>
      </div>
    </main>
  );
}
