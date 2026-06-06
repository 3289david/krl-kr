"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";

interface Comment {
  id: number;
  post_id: number;
  author_name: string;
  author_email: string | null;
  content: string;
  status: string;
  created_at: number;
  post_title: string;
  post_slug: string;
}

const STATUS_LABEL: Record<string, string> = { approved: "승인됨", pending: "대기중", spam: "스팸" };
const STATUS_COLOR: Record<string, string> = { approved: "#16a34a", pending: "#d97706", spam: "#dc2626" };

export default function BlogCommentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [comments, setComments] = useState<Comment[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/blog/${id}/comments?status=${filter}`)
      .then(r => r.json())
      .then(data => setComments(data.comments ?? []))
      .finally(() => setLoading(false));
  }, [id, filter]);

  async function handleDelete(commentId: number) {
    if (!confirm("이 댓글을 삭제하시겠습니까?")) return;
    setDeleting(commentId);
    const res = await fetch(`/api/v1/blog/${id}/comments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment_id: commentId }),
    });
    if (res.ok) setComments(prev => prev.filter(c => c.id !== commentId));
    setDeleting(null);
  }

  const tabs = [
    { key: "all", label: "전체" },
    { key: "approved", label: "승인됨" },
    { key: "spam", label: "스팸" },
  ];

  return (
    <div className="dashboard-page">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginBottom: 6 }}>
            <Link href={`/dashboard/blog/${id}`} style={{ color: "var(--color-muted)" }}>← 글 목록</Link>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>댓글 관리</h1>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--color-hairline)" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            style={{
              padding: "8px 16px", background: "none", border: "none", cursor: "pointer",
              fontWeight: filter === t.key ? 600 : 400,
              color: filter === t.key ? "var(--color-ink)" : "var(--color-muted)",
              borderBottom: `2px solid ${filter === t.key ? "var(--color-ink)" : "transparent"}`,
              fontSize: "0.875rem",
            }}>
            {t.label}
            <span style={{ marginLeft: 6, fontSize: "0.75rem", color: "var(--color-muted)" }}>
              {filter === t.key ? comments.length : ""}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "var(--color-muted)" }}>불러오는 중...</p>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 32px", background: "var(--color-surface)", borderRadius: 14, border: "1px solid var(--color-hairline)" }}>
          <p style={{ color: "var(--color-muted)" }}>댓글이 없습니다.</p>
        </div>
      ) : (
        <div style={{ background: "var(--color-surface)", borderRadius: 14, border: "1px solid var(--color-hairline)", overflow: "hidden" }}>
          {comments.map((comment, i) => (
            <div key={comment.id} style={{ padding: "16px 20px", borderBottom: i < comments.length - 1 ? "1px solid var(--color-hairline)" : "none" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{comment.author_name}</span>
                    {comment.author_email && (
                      <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{comment.author_email}</span>
                    )}
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: STATUS_COLOR[comment.status] ?? "#6b7280" }}>
                      ● {STATUS_LABEL[comment.status] ?? comment.status}
                    </span>
                    <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                      {new Date(Number(comment.created_at)).toLocaleDateString("ko-KR")} {new Date(Number(comment.created_at)).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.9375rem", lineHeight: 1.65, color: "var(--color-ink)", margin: "0 0 10px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {comment.content}
                  </p>
                  <div style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                    글:{" "}
                    <Link href={`/dashboard/blog/${id}/editor/${comment.post_id}`} style={{ color: "var(--color-accent)", textDecoration: "none" }}>
                      {comment.post_title}
                    </Link>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(comment.id)}
                  disabled={deleting === comment.id}
                  className="btn btn-sm btn-ghost"
                  style={{ color: "#dc2626", flexShrink: 0, fontSize: "0.8125rem" }}>
                  {deleting === comment.id ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
