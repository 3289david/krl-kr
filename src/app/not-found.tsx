import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — 페이지를 찾을 수 없습니다",
};

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-canvas)",
        padding: "24px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "480px" }}>
        {/* 404 display */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(6rem, 20vw, 10rem)",
            fontWeight: 700,
            letterSpacing: "-0.05em",
            color: "#EAE6E2",
            lineHeight: 1,
            marginBottom: "24px",
            userSelect: "none",
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            marginBottom: "12px",
            color: "var(--color-ink)",
          }}
        >
          링크를 찾을 수 없습니다
        </h1>

        <p
          style={{
            fontSize: "0.9375rem",
            color: "var(--color-muted)",
            marginBottom: "32px",
            lineHeight: 1.6,
          }}
        >
          요청하신 단축 링크가 존재하지 않거나 삭제되었습니다.
          링크 주소를 다시 확인해 주세요.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/"
            className="btn btn-primary btn-pill"
            style={{ textDecoration: "none" }}
          >
            홈으로
          </Link>
          <Link
            href="/dashboard"
            className="btn btn-secondary btn-pill"
            style={{ textDecoration: "none" }}
          >
            대시보드
          </Link>
        </div>

        <p
          style={{
            marginTop: "40px",
            fontSize: "0.8125rem",
            color: "var(--color-ash)",
            fontFamily: "var(--font-mono)",
          }}
        >
          krl.kr &mdash; URL Shortener
        </p>
      </div>
    </div>
  );
}
