"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckIcon, EyeIcon, EyeOffIcon, AlertCircleIcon } from "@/components/icons";

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: "8자 이상" },
  { test: (p: string) => /[A-Z]/.test(p), label: "대문자 포함" },
  { test: (p: string) => /[0-9]/.test(p), label: "숫자 포함" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateForm(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "회원가입에 실패했습니다.");
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
      <div style={{ width: "100%", maxWidth: "440px" }}>
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
            style={{ fontSize: "1.375rem", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "8px" }}
          >
            무료 계정 만들기
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", marginBottom: "28px" }}>
            이미 계정이 있으신가요?{" "}
            <Link href="/login" style={{ color: "var(--color-ink)", fontWeight: 500 }}>
              로그인
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
            onSubmit={handleRegister}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div>
              <label
                htmlFor="name"
                style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}
              >
                이름 (선택)
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
                placeholder="홍길동"
                autoComplete="name"
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}
              >
                이메일 *
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}
              >
                비밀번호 *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => updateForm("password", e.target.value)}
                  placeholder="최소 8자 이상"
                  required
                  minLength={8}
                  autoComplete="new-password"
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
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>

              {/* Password strength */}
              {form.password && (
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginTop: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  {PASSWORD_RULES.map((rule) => (
                    <div
                      key={rule.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "0.75rem",
                        color: rule.test(form.password) ? "var(--color-success)" : "var(--color-ash)",
                      }}
                    >
                      <CheckIcon size={12} strokeWidth={2.5} />
                      {rule.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !form.email || !form.password}
              className="btn btn-primary btn-pill"
              style={{ justifyContent: "center", marginTop: "4px" }}
            >
              {loading ? "계정 생성 중..." : "무료 계정 만들기"}
            </button>
          </form>

          <div
            style={{
              marginTop: "20px",
              paddingTop: "20px",
              borderTop: "1px solid var(--color-hairline)",
              textAlign: "center",
              fontSize: "0.8125rem",
              color: "var(--color-muted)",
              lineHeight: 1.6,
            }}
          >
            가입하면{" "}
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

        {/* Benefits */}
        <div
          style={{
            marginTop: "24px",
            padding: "20px 24px",
            background: "var(--color-lifted)",
            border: "1px solid var(--color-hairline)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <p
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              marginBottom: "12px",
              color: "var(--color-ink)",
            }}
          >
            무료 플랜 포함 기능:
          </p>
          {[
            "월 50개 링크 생성",
            "QR 코드 자동 생성",
            "기본 클릭 분석",
            "API 접근 (100 req/일)",
          ].map((benefit) => (
            <div
              key={benefit}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.875rem",
                color: "var(--color-body)",
                marginBottom: "8px",
              }}
            >
              <CheckIcon size={14} strokeWidth={2.5} />
              {benefit}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
