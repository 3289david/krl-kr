"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const BOARDS = [
  { value: "free", label: "자유게시판" },
  { value: "feature", label: "기능 제안" },
];

function NewPostForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultBoard = searchParams.get("board") === "feature" ? "feature" : "free";

  const [board, setBoard] = useState(defaultBoard);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board, title: title.trim(), content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { router.push("/login?redirect=/community/new"); return; }
        setError(data.error ?? "오류가 발생했습니다.");
        return;
      }
      router.push(`/community/${data.id}`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--color-canvas)" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px", fontSize: "0.875rem", color: "var(--color-muted)" }}>
          <Link href="/community" style={{ color: "var(--color-muted)", textDecoration: "none" }}>커뮤니티</Link>
          <span>›</span>
          <span>새 글 작성</span>
        </div>

        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "28px" }}>새 글 작성</h1>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Board select */}
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "8px" }}>게시판</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {BOARDS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => setBoard(b.value)}
                  style={{
                    padding: "8px 18px", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600,
                    cursor: "pointer", transition: "all 0.15s",
                    background: board === b.value ? "var(--color-ink)" : "var(--color-lifted)",
                    color: board === b.value ? "var(--color-canvas)" : "var(--color-body)",
                    border: board === b.value ? "1px solid var(--color-ink)" : "1px solid var(--color-hairline-strong)",
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "8px" }}>
              제목 <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              maxLength={200}
              required
              className="input"
              style={{ fontSize: "1rem" }}
            />
            <div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "4px" }}>{title.length}/200</div>
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "8px" }}>
              내용 <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              maxLength={10000}
              required
              rows={14}
              style={{
                width: "100%", padding: "12px 14px",
                border: "1px solid var(--color-hairline-strong)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.9375rem", lineHeight: 1.7,
                fontFamily: "var(--font-sans)",
                background: "var(--color-lifted)",
                color: "var(--color-ink)",
                resize: "vertical", outline: "none",
                transition: "border-color 0.15s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-ink)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-hairline-strong)")}
            />
            <div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "4px" }}>{content.length}/10000</div>
          </div>

          {error && (
            <div style={{
              padding: "11px 14px", background: "#FFF1F2",
              border: "1px solid #FECDD3", borderRadius: "var(--radius-sm)",
              color: "#9B1C1C", fontSize: "0.875rem",
            }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <Link href="/community" style={{
              padding: "10px 20px", borderRadius: "8px",
              border: "1px solid var(--color-hairline-strong)",
              textDecoration: "none", fontSize: "0.875rem",
              color: "var(--color-body)", fontWeight: 500,
            }}>취소</Link>
            <button
              type="submit"
              disabled={loading || !title.trim() || !content.trim()}
              className="btn btn-primary"
              style={{ padding: "10px 28px", borderRadius: "8px", fontSize: "0.875rem" }}
            >
              {loading ? "게시 중..." : "게시하기"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function NewPostPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "var(--color-muted)" }}>로딩 중...</div>}>
      <NewPostForm />
    </Suspense>
  );
}
