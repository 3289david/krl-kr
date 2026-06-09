"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { formatRelativeTime, formatDateTime } from "@/lib/utils";

const BOARD_LABELS: Record<string, string> = {
  notice: "공지사항",
  free: "자유게시판",
  feature: "기능 제안",
};

interface Post {
  id: string;
  board: string;
  title: string;
  content: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_pinned: boolean;
  liked: boolean;
  is_own: boolean;
  created_at: number;
  updated_at: number;
  author: { id: string; name: string };
}

interface Comment {
  id: string;
  content: string | null;
  is_deleted: boolean;
  created_at: number;
  author: { id: string; name: string };
}

function ContentRenderer({ text }: { text: string }) {
  return (
    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.8, fontSize: "0.9375rem", color: "var(--color-ink)" }}>
      {text}
    </div>
  );
}

export default function PostPage() {
  const { slug: id } = useParams<{ slug: string }>();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liking, setLiking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadPost = useCallback(async () => {
    try {
      const [postRes, commentsRes] = await Promise.all([
        fetch(`/api/v1/community/${id}`),
        fetch(`/api/v1/community/${id}/comments`),
      ]);
      if (postRes.status === 404) { setNotFound(true); return; }
      if (postRes.ok) setPost(await postRes.json());
      if (commentsRes.ok) setComments((await commentsRes.json()).comments ?? []);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPost();
    // Check if logged in
    fetch("/api/auth/me")
      .then(async (r) => {
        if (r.ok) {
          setIsLoggedIn(true);
          const data = await r.json();
          setCurrentUserId(data.user?.id ?? null);
        }
      })
      .catch(() => {});
  }, [loadPost]);

  async function handleLike() {
    if (!isLoggedIn) { router.push(`/login?redirect=/community/${id}`); return; }
    if (liking) return;
    setLiking(true);
    try {
      const res = await fetch(`/api/v1/community/${id}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPost((p) => p ? { ...p, liked: data.liked, like_count: data.like_count } : p);
      }
    } finally {
      setLiking(false);
    }
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!isLoggedIn) { router.push(`/login?redirect=/community/${id}`); return; }
    setSubmittingComment(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/community/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (res.status === 401) { router.push(`/login?redirect=/community/${id}`); return; }
      if (res.ok) {
        const c = await res.json();
        setComments((prev) => [...prev, c]);
        setPost((p) => p ? { ...p, comment_count: p.comment_count + 1 } : p);
        setCommentText("");
      } else {
        const d = await res.json();
        setError(d.error ?? "댓글 등록에 실패했습니다.");
      }
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      const res = await fetch(`/api/v1/community/${id}/comments?comment_id=${commentId}`, { method: "DELETE" });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setPost((p) => p ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p);
      }
    } catch {}
  }

  async function handleSaveEdit() {
    if (!editTitle.trim() || !editContent.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/v1/community/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), content: editContent.trim() }),
      });
      if (res.ok) {
        setPost((p) => p ? { ...p, title: editTitle.trim(), content: editContent.trim(), updated_at: Date.now() } : p);
        setEditing(false);
      }
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/v1/community/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/community");
    } catch {}
  }

  if (loading) {
    return (
      <main style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--color-muted)" }}>불러오는 중...</div>
      </main>
    );
  }

  if (notFound || !post) {
    return (
      <main style={{ minHeight: "80vh", background: "var(--color-canvas)" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "48px 24px" }}>
          <div style={{
            background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
            borderRadius: "16px", padding: "48px 32px", textAlign: "center",
          }}>
            <p style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "12px" }}>게시글을 찾을 수 없습니다</p>
            <p style={{ color: "var(--color-muted)", marginBottom: "24px" }}>삭제되었거나 존재하지 않는 게시글입니다.</p>
            <Link href="/community" style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "10px 20px", borderRadius: "8px",
              background: "var(--color-ink)", color: "var(--color-canvas)",
              textDecoration: "none", fontSize: "0.875rem", fontWeight: 600,
            }}>← 커뮤니티로</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--color-canvas)" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px", fontSize: "0.8125rem", color: "var(--color-muted)" }}>
          <Link href="/community" style={{ color: "var(--color-muted)", textDecoration: "none" }}>커뮤니티</Link>
          <span>›</span>
          <Link href={`/community?board=${post.board}`} style={{ color: "var(--color-muted)", textDecoration: "none" }}>
            {BOARD_LABELS[post.board] ?? post.board}
          </Link>
        </div>

        {/* Post */}
        <article style={{
          background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
          borderRadius: "14px", overflow: "hidden", marginBottom: "20px",
        }}>
          {/* Header */}
          <div style={{ padding: "28px 28px 20px" }}>
            {post.is_pinned && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "0.6875rem", fontWeight: 700,
                color: "#ef4444", background: "#FFF1F2", border: "1px solid #FECDD3",
                borderRadius: "4px", padding: "2px 7px", marginBottom: "10px",
              }}><svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M16 2v4l2 2-8 8-2-2 8-8 2 2V2h-2zM5 20l3-3"/></svg>고정</span>
            )}

            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input"
                  style={{ fontSize: "1.25rem", fontWeight: 700 }}
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={12}
                  style={{
                    width: "100%", padding: "12px 14px",
                    border: "1px solid var(--color-hairline-strong)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.9375rem", lineHeight: 1.7,
                    fontFamily: "var(--font-sans)",
                    background: "var(--color-canvas)",
                    color: "var(--color-ink)",
                    resize: "vertical", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button onClick={() => setEditing(false)} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid var(--color-hairline-strong)", background: "transparent", cursor: "pointer", fontSize: "0.875rem" }}>취소</button>
                  <button onClick={handleSaveEdit} disabled={savingEdit} className="btn btn-primary" style={{ padding: "8px 20px", borderRadius: "7px", fontSize: "0.875rem" }}>
                    {savingEdit ? "저장 중..." : "저장"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "14px", lineHeight: 1.3 }}>
                  {post.title}
                </h1>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                    <span style={{ fontWeight: 600, color: "var(--color-body)" }}>{post.author.name}</span>
                    <span title={formatDateTime(post.created_at)}>{formatRelativeTime(post.created_at)}</span>
                    <span>조회 {post.view_count.toLocaleString()}</span>
                  </div>
                  {post.is_own && (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => { setEditTitle(post.title); setEditContent(post.content); setEditing(true); }} style={{
                        padding: "5px 12px", borderRadius: "6px", fontSize: "0.8125rem",
                        border: "1px solid var(--color-hairline-strong)", background: "transparent",
                        color: "var(--color-muted)", cursor: "pointer",
                      }}>수정</button>
                      <button onClick={() => setDeleteConfirm(true)} style={{
                        padding: "5px 12px", borderRadius: "6px", fontSize: "0.8125rem",
                        border: "1px solid #FECDD3", background: "#FFF1F2",
                        color: "#9B1C1C", cursor: "pointer",
                      }}>삭제</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Divider */}
          {!editing && <div style={{ borderTop: "1px solid var(--color-hairline)", margin: "0 28px" }} />}

          {/* Body */}
          {!editing && (
            <div style={{ padding: "24px 28px 20px" }}>
              <ContentRenderer text={post.content} />
            </div>
          )}

          {/* Footer — like button */}
          {!editing && (
            <div style={{ padding: "16px 28px", borderTop: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={handleLike}
                disabled={liking}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "7px 16px", borderRadius: "99px", cursor: "pointer",
                  fontSize: "0.875rem", fontWeight: 600, transition: "all 0.15s",
                  background: post.liked ? "var(--color-ink)" : "transparent",
                  color: post.liked ? "var(--color-canvas)" : "var(--color-muted)",
                  border: post.liked ? "1px solid var(--color-ink)" : "1px solid var(--color-hairline-strong)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={post.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
                좋아요 {post.like_count > 0 ? post.like_count : ""}
              </button>
              <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                댓글 {post.comment_count}개
              </span>
            </div>
          )}
        </article>

        {/* Comments */}
        <div style={{
          background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
          borderRadius: "14px", overflow: "hidden",
        }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--color-hairline)", fontWeight: 700, fontSize: "0.9375rem" }}>
            댓글 {comments.filter((c) => !c.is_deleted).length}개
          </div>

          {comments.length === 0 ? (
            <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem" }}>
              아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
            </div>
          ) : (
            <div>
              {comments.map((c) => (
                <div key={c.id} style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid var(--color-hairline)",
                  opacity: c.is_deleted ? 0.5 : 1,
                }}>
                  {c.is_deleted ? (
                    <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", fontStyle: "italic" }}>삭제된 댓글입니다.</p>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.8125rem" }}>
                          <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>{c.author.name}</span>
                          <span style={{ color: "var(--color-muted)" }}>{formatRelativeTime(c.created_at)}</span>
                        </div>
                        {(c.author.id === currentUserId || post.is_own) && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "0.75rem", padding: "2px 6px" }}
                          >삭제</button>
                        )}
                      </div>
                      <p style={{ fontSize: "0.9rem", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
                        {c.content}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Comment form */}
          <div style={{ padding: "20px 24px", borderTop: comments.length > 0 ? "none" : "1px solid var(--color-hairline)" }}>
            {isLoggedIn ? (
              <form onSubmit={handleCommentSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="댓글을 입력하세요"
                  maxLength={2000}
                  rows={3}
                  style={{
                    width: "100%", padding: "11px 14px",
                    border: "1px solid var(--color-hairline-strong)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.9rem", lineHeight: 1.6,
                    fontFamily: "var(--font-sans)",
                    background: "var(--color-canvas)",
                    color: "var(--color-ink)",
                    resize: "vertical", outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--color-ink)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--color-hairline-strong)")}
                />
                {error && <p style={{ fontSize: "0.875rem", color: "var(--color-danger)", margin: 0 }}>{error}</p>}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    disabled={submittingComment || !commentText.trim()}
                    className="btn btn-primary"
                    style={{ padding: "8px 20px", borderRadius: "7px", fontSize: "0.875rem" }}
                  >
                    {submittingComment ? "등록 중..." : "댓글 등록"}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <Link href={`/login?redirect=/community/${id}`} style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "10px 20px", borderRadius: "8px",
                  border: "1px solid var(--color-hairline-strong)",
                  textDecoration: "none", fontSize: "0.875rem",
                  color: "var(--color-body)", fontWeight: 500,
                }}>로그인 후 댓글 작성</Link>
              </div>
            )}
          </div>
        </div>

        {/* Back link */}
        <div style={{ marginTop: "20px" }}>
          <Link href={`/community?board=${post.board}`} style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            fontSize: "0.875rem", color: "var(--color-muted)", textDecoration: "none",
          }}>
            ← {BOARD_LABELS[post.board] ?? "게시판"}으로 돌아가기
          </Link>
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(20,20,19,0.5)",
          backdropFilter: "blur(4px)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
        }}>
          <div style={{
            background: "var(--color-lifted)", borderRadius: "16px",
            padding: "32px", maxWidth: "360px", width: "100%",
            border: "1px solid var(--color-hairline-strong)",
          }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "10px" }}>게시글 삭제</h3>
            <p style={{ color: "var(--color-muted)", fontSize: "0.9rem", marginBottom: "24px" }}>
              이 게시글을 삭제하면 복구할 수 없습니다.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirm(false)} style={{
                flex: 1, padding: "10px", borderRadius: "8px",
                border: "1px solid var(--color-hairline-strong)", background: "transparent",
                cursor: "pointer", fontSize: "0.875rem", fontWeight: 600,
              }}>취소</button>
              <button onClick={handleDelete} style={{
                flex: 1, padding: "10px", borderRadius: "8px",
                background: "#ef4444", color: "#fff",
                border: "none", cursor: "pointer",
                fontSize: "0.875rem", fontWeight: 600,
              }}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
