"use client";
import { useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EyeIcon, EyeOffIcon, AlertCircleIcon } from "@/components/icons";
import { AltchaWidget } from "@/components/AltchaWidget";

function LoginFormInner({ challengeJson }: { challengeJson: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [failCount, setFailCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const altchaEl = formRef.current?.querySelector<HTMLInputElement>('input[name="altcha"]');
      const altchaPayload = altchaEl?.value ?? null;

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, altcha: altchaPayload }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFailCount((c) => c + 1);
        setError(data.error ?? "로그인에 실패했습니다.");
        return;
      }

      router.refresh();
      router.push(redirectTo);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

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
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <Link href="/" style={{
            fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1.25rem",
            letterSpacing: "0.04em", color: "var(--color-ink)", textDecoration: "none",
          }}>KRL.KR</Link>
        </div>

        <div
          className="auth-card"
          style={{
            background: "var(--color-lifted)",
            border: "1px solid var(--color-hairline-strong)",
            borderRadius: "var(--radius-xl)",
            padding: "40px",
          }}
        >
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

          {error && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              padding: "12px 14px", background: "#FFF1F2", border: "1px solid #FECDD3",
              borderRadius: "10px", marginBottom: "20px", color: "#9B1C1C", fontSize: "0.875rem",
            }}>
              <AlertCircleIcon size={16} />
              <div>
                {error}
                {failCount >= 3 && (
                  <p style={{ marginTop: "4px", fontSize: "0.8125rem", color: "#B91C1C" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, display: "inline", verticalAlign: "middle", marginRight: "4px" }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    5회 실패 시 계정이 일시적으로 잠깁니다.
                  </p>
                )}
              </div>
            </div>
          )}

          <form
            ref={formRef}
            onSubmit={handleLogin}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div>
              <label htmlFor="email" style={{
                display: "block", fontSize: "0.875rem", fontWeight: 500,
                marginBottom: "6px", color: "var(--color-ink)",
              }}>
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="input"
              />
            </div>

            <div>
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: "6px",
              }}>
                <label htmlFor="password" style={{
                  fontSize: "0.875rem", fontWeight: 500, color: "var(--color-ink)",
                }}>
                  비밀번호
                </label>
                <Link href="/forgot-password" style={{
                  fontSize: "0.8125rem", color: "var(--color-muted)", textDecoration: "none",
                }}>
                  비밀번호 찾기
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="input"
                  style={{ paddingRight: "44px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: "12px", top: "50%",
                    transform: "translateY(-50%)", background: "none", border: "none",
                    cursor: "pointer", color: "var(--color-muted)", display: "flex", padding: "4px",
                  }}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>

            {/* Altcha CAPTCHA — challenge는 서버에서 생성, 네트워크 요청 없음 */}
            <div>
              <AltchaWidget name="altcha" challengeJson={challengeJson} />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn btn-primary btn-pill"
              style={{ justifyContent: "center", marginTop: "4px" }}
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div style={{
            marginTop: "20px", paddingTop: "20px",
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

export function LoginForm({ challengeJson }: { challengeJson: string }) {
  return (
    <Suspense fallback={null}>
      <LoginFormInner challengeJson={challengeJson} />
    </Suspense>
  );
}
