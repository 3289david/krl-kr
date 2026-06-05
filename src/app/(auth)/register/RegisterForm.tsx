"use client";
import { useState, useRef, Suspense } from "react"; // eslint-disable-line
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AltchaWidget } from "@/components/AltchaWidget";
import { AlertCircleIcon } from "@/components/icons";

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

function RegisterFormInner({ challengeJson }: { challengeJson: string }) {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const googleHref = `/api/auth/google${redirectTo !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`;
  const githubHref = `/api/auth/github${redirectTo !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`;

  function handleOAuthClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const altchaEl = formRef.current?.querySelector<HTMLInputElement>('input[name="altcha"]');
    const skipAltcha = process.env.NEXT_PUBLIC_SKIP_ALTCHA === "1";
    if (!skipAltcha && !altchaEl?.value) {
      e.preventDefault();
      setError("보안 인증을 먼저 완료해주세요.");
    } else {
      setError("");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--color-canvas)",
      padding: "24px", fontFamily: "var(--font-sans)",
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
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
            무료 계정 만들기
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", marginBottom: "28px" }}>
            이미 계정이 있으신가요?{" "}
            <Link
              href={`/login${redirectTo !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
              style={{ color: "var(--color-ink)", fontWeight: 600 }}
            >
              로그인
            </Link>
          </p>

          {error && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              padding: "12px 14px", background: "#FFF1F2", border: "1px solid #FECDD3",
              borderRadius: "10px", marginBottom: "20px", color: "#9B1C1C", fontSize: "0.875rem",
            }}>
              <AlertCircleIcon size={16} />
              {error}
            </div>
          )}

          <form ref={formRef} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Altcha — anti-bot proof-of-work before OAuth */}
            <div>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginBottom: "8px" }}>
                가입 전 보안 인증을 완료해주세요.
              </p>
              <AltchaWidget
                name="altcha"
                challengeJson={challengeJson}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <a
                href={googleHref}
                onClick={handleOAuthClick}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                  padding: "13px 20px", borderRadius: "10px",
                  background: "var(--color-canvas)", border: "1.5px solid var(--color-hairline-strong)",
                  color: "var(--color-ink)", fontWeight: 600, fontSize: "0.9375rem",
                  textDecoration: "none", transition: "background 0.15s",
                }}
              >
                <GoogleIcon />
                Google로 가입하기
              </a>

              <a
                href={githubHref}
                onClick={handleOAuthClick}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                  padding: "13px 20px", borderRadius: "10px",
                  background: "#1a1714", border: "1.5px solid #1a1714",
                  color: "#f4f0e6", fontWeight: 600, fontSize: "0.9375rem",
                  textDecoration: "none", transition: "opacity 0.15s",
                }}
              >
                <GitHubIcon />
                GitHub로 가입하기
              </a>
            </div>
          </form>

          <div style={{
            marginTop: "20px", paddingTop: "16px",
            borderTop: "1px solid var(--color-hairline)",
            textAlign: "center", fontSize: "0.8125rem",
            color: "var(--color-muted)", lineHeight: 1.6,
          }}>
            가입하면{" "}
            <Link href="/legal/terms" style={{ color: "var(--color-ink)" }}>이용약관</Link>
            과{" "}
            <Link href="/legal/privacy" style={{ color: "var(--color-ink)" }}>개인정보처리방침</Link>
            에 동의하게 됩니다.
          </div>
        </div>

        <div style={{
          marginTop: "20px", padding: "20px 24px",
          background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
          borderRadius: "var(--radius-lg)",
        }}>
          <p style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: "12px", color: "var(--color-ink)" }}>
            무료 플랜 포함 기능:
          </p>
          {["URL 단축 무제한", "KRL Drive 5GB", "웹 호스팅 1개 사이트", "AI 채팅 + 이미지 생성"].map((benefit) => (
            <div key={benefit} style={{
              display: "flex", alignItems: "center", gap: "8px",
              fontSize: "0.875rem", color: "var(--color-body)", marginBottom: "8px",
            }}>
              <div style={{
                width: "16px", height: "16px", borderRadius: "50%",
                background: "#dcfce7", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0,
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              {benefit}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RegisterForm({ challengeJson }: { challengeJson: string }) {
  return (
    <Suspense fallback={null}>
      <RegisterFormInner challengeJson={challengeJson} />
    </Suspense>
  );
}
