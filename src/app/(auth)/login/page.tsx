"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeOffIcon, AlertCircleIcon } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "로그인에 실패했습니다.");
        return;
      }

      router.push("/dashboard");
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
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: "1.25rem",
              letterSpacing: "0.04em",
              color: "var(--color-ink)",
              textDecoration: "none",
            }}
          >
            KRL.KR
          </Link>
        </div>

        <div
          style={{
            background: "var(--color-lifted)",
            border: "1px solid var(--color-hairline-strong)",
            borderRadius: "var(--radius-xl)",
            padding: "40px",
          }}
        >
          <h1
            style={{
              fontSize: "1.375rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              marginBottom: "8px",
            }}
          >
            로그인
          </h1>
          <p
            style={{
              fontSize: "0.9375rem",
              color: "var(--color-muted)",
              marginBottom: "28px",
            }}
          >
            계정이 없으신가요?{" "}
            <Link href="/register" style={{ color: "var(--color-ink)", fontWeight: 500 }}>
              무료 가입
            </Link>
          </p>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "12px 14px",
                background: "#FFF1F2",
                border: "1px solid #FECDD3",
                borderRadius: "var(--radius-sm)",
                marginBottom: "20px",
                color: "#9B1C1C",
                fontSize: "0.875rem",
              }}
            >
              <AlertCircleIcon size={16} />
              {error}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  marginBottom: "6px",
                  color: "var(--color-ink)",
                }}
              >
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <label
                  htmlFor="password"
                  style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-ink)" }}
                >
                  비밀번호
                </label>
                <Link
                  href="/forgot-password"
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--color-muted)",
                    textDecoration: "none",
                  }}
                >
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
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-muted)",
                    display: "flex",
                    padding: "4px",
                  }}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
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

          <div
            style={{
              marginTop: "24px",
              paddingTop: "24px",
              borderTop: "1px solid var(--color-hairline)",
              textAlign: "center",
              fontSize: "0.8125rem",
              color: "var(--color-muted)",
            }}
          >
            로그인하면{" "}
            <Link href="/legal/terms" style={{ color: "var(--color-ink)" }}>
              이용약관
            </Link>
            과{" "}
            <Link href="/legal/privacy" style={{ color: "var(--color-ink)" }}>
              개인정보처리방침
            </Link>
            에 동의하게 됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}
