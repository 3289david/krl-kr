import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Link-in-bio | KRL.KR",
  description: "인스타그램, 틱톡용 링크 모음 페이지를 무료로 만드세요.",
};

export default async function BioPage() {
  // If already logged in, redirect to dashboard
  const session = await getSession();
  if (session) redirect("/dashboard/bio");

  return (
    <main style={{ minHeight: "100vh", background: "var(--color-canvas)", fontFamily: "var(--font-sans)" }}>
      <section className="section">
        <div className="container" style={{ maxWidth: "560px" }}>
          <div style={{ paddingTop: "80px", textAlign: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "4px 12px", borderRadius: "9999px",
              background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)",
              fontSize: "0.8125rem", color: "var(--color-muted)", marginBottom: "24px",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Link-in-bio
            </div>

            <h1 style={{ fontSize: "2rem", fontWeight: 500, letterSpacing: "-0.02em", marginBottom: "16px" }}>
              모든 링크를 한 페이지에
            </h1>
            <p style={{ color: "var(--color-muted)", fontSize: "1.0625rem", lineHeight: 1.7, marginBottom: "40px" }}>
              인스타그램·틱톡 프로필에 넣을 링크 모음 페이지를 무료로 만드세요.
              <br />
              <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.9em", background: "var(--color-surface-card)", padding: "1px 6px", borderRadius: "4px" }}>krl.kr/@내닉네임</code> 주소가 생깁니다.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/register" className="btn btn-primary btn-pill" style={{ textDecoration: "none" }}>
                무료로 만들기
              </Link>
              <Link href="/login" className="btn btn-ghost btn-pill" style={{ textDecoration: "none" }}>
                로그인 후 관리
              </Link>
            </div>
          </div>

          {/* Preview */}
          <div style={{
            marginTop: "64px",
            background: "var(--color-lifted)",
            border: "1px solid var(--color-hairline)",
            borderRadius: "var(--radius-xl)",
            padding: "40px 32px",
            textAlign: "center",
          }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "var(--color-ink)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "var(--color-canvas)", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.875rem" }}>K</span>
            </div>
            <p style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "6px" }}>@example</p>
            <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", marginBottom: "24px" }}>링크 모음 페이지 예시</p>

            {[
              "내 블로그",
              "쇼핑몰 바로가기",
              "인스타그램",
              "유튜브 채널",
            ].map((label) => (
              <div key={label} style={{
                padding: "12px 20px",
                border: "1px solid var(--color-hairline)",
                borderRadius: "var(--radius-sm)",
                marginBottom: "10px",
                fontSize: "0.9375rem",
                fontWeight: 500,
                background: "var(--color-white)",
                cursor: "default",
              }}>
                {label}
              </div>
            ))}
          </div>

          {/* Features */}
          <div style={{ marginTop: "48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {[
              { title: "커스텀 주소", desc: "krl.kr/@닉네임" },
              { title: "링크 관리", desc: "추가·삭제·순서 변경" },
              { title: "조회수 통계", desc: "클릭 수 확인" },
              { title: "테마 선택", desc: "기본 / 다크 / 미니멀" },
            ].map((f) => (
              <div key={f.title} style={{
                padding: "20px",
                background: "var(--color-lifted)",
                border: "1px solid var(--color-hairline)",
                borderRadius: "var(--radius-xl)",
              }}>
                <p style={{ fontWeight: 600, marginBottom: "4px" }}>{f.title}</p>
                <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
