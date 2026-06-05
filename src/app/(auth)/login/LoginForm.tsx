"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_not_configured: "OAuth가 아직 설정되지 않았습니다. 관리자에게 문의하세요.",
  invalid_state: "보안 검증 실패. 다시 시도해주세요.",
  oauth_failed: "소셜 로그인에 실패했습니다. 다시 시도해주세요.",
  no_email: "소셜 계정에서 이메일을 가져올 수 없습니다. 계정 이메일을 공개로 설정해주세요.",
  access_denied: "로그인이 취소되었습니다.",
};

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

function LoginFormInner() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const errorCode = searchParams.get("error") ?? "";
  const errorMsg = ERROR_MESSAGES[errorCode] ?? (errorCode ? "로그인에 실패했습니다. 다시 시도해주세요." : "");

  const googleHref = `/api/auth/google${redirectTo !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`;
  const githubHref = `/api/auth/github${redirectTo !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--color-canvas)",
      padding: "24px", fontFamily: "var(--font-sans)",
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <Link href="/" style={{
            fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1.25rem",
            letterSpacing: "0.04em", color: "var(--color-ink)", textDecoration: "none",
          }}>KRL.KR</Link>
        </div>

        <div style={{
          background: "var(--color-lifted)",
          border: "1px solid var(--color-hairline-strong)",
          borderRadius: "var(--radius-xl)",
          padding: "40px",
        }}>
          <h1 style={{
            fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em",
            marginBottom: "6px", color: "var(--color-ink)",
          }}>
            로그인
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", marginBottom: "28px" }}>
            계정이 없으신가요?{" "}
            <Link
              href={`/register${redirectTo !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
              style={{ color: "var(--color-ink)", fontWeight: 600 }}
            >
              무료 가입
            </Link>
          </p>

          {errorMsg && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              padding: "12px 14px", background: "#FFF1F2", border: "1px solid #FECDD3",
              borderRadius: "10px", marginBottom: "20px", color: "#9B1C1C", fontSize: "0.875rem",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <a
              href={googleHref}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                padding: "13px 20px", borderRadius: "10px",
                background: "var(--color-canvas)", border: "1.5px solid var(--color-hairline-strong)",
                color: "var(--color-ink)", fontWeight: 600, fontSize: "0.9375rem",
                textDecoration: "none", transition: "background 0.15s",
              }}
            >
              <GoogleIcon />
              Google로 로그인
            </a>

            <a
              href={githubHref}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                padding: "13px 20px", borderRadius: "10px",
                background: "#1a1714", border: "1.5px solid #1a1714",
                color: "#f4f0e6", fontWeight: 600, fontSize: "0.9375rem",
                textDecoration: "none", transition: "opacity 0.15s",
              }}
            >
              <GitHubIcon />
              GitHub로 로그인
            </a>
          </div>

          <div style={{
            marginTop: "24px", paddingTop: "20px",
            borderTop: "1px solid var(--color-hairline)",
            textAlign: "center", fontSize: "0.8125rem", color: "var(--color-muted)",
          }}>
            로그인하면{" "}
            <Link href="/legal/terms" style={{ color: "var(--color-ink)" }}>이용약관</Link>
            과{" "}
            <Link href="/legal/privacy" style={{ color: "var(--color-ink)" }}>개인정보처리방침</Link>
            에 동의하게 됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginForm({ challengeJson: _ }: { challengeJson: string }) {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  );
}
