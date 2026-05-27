"use client";
import { useState, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckIcon, EyeIcon, EyeOffIcon, AlertCircleIcon } from "@/components/icons";
import { AltchaWidget } from "@/components/AltchaWidget";

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: "8자 이상" },
  { test: (p: string) => /[A-Z]/.test(p), label: "대문자 포함" },
  { test: (p: string) => /[0-9]/.test(p), label: "숫자 포함" },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "특수문자" },
];

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  if (passed <= 1) return { score: 1, label: "매우 약함", color: "#ef4444" };
  if (passed === 2) return { score: 2, label: "약함", color: "#f97316" };
  if (passed === 3) return { score: 3, label: "보통", color: "#eab308" };
  return { score: 4, label: "강함", color: "#22c55e" };
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function updateForm(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const altchaEl = formRef.current?.querySelector<HTMLInputElement>('input[name="altcha"]');
      const altchaPayload = altchaEl?.value ?? null;

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, altcha: altchaPayload }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "회원가입에 실패했습니다.");
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

  const strength = form.password ? getPasswordStrength(form.password) : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(58,58,239,0.05) 0%, transparent 60%), var(--color-canvas)",
        padding: "24px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "440px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "linear-gradient(135deg, #3a3aef 0%, #8b5cf6 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 10px rgba(58,58,239,0.25)",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.6875rem", color: "#fff" }}>KR</span>
            </div>
            <span style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: "1.125rem",
              letterSpacing: "0.04em",
              color: "var(--color-ink)",
            }}>
              KRL.KR
            </span>
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
            style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "6px", color: "var(--color-ink)" }}
          >
            무료 계정 만들기
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", marginBottom: "28px" }}>
            이미 계정이 있으신가요?{" "}
            <Link href={`/login${redirectTo !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`} style={{ color: "var(--color-ink)", fontWeight: 600 }}>
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
                borderRadius: "10px",
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
            ref={formRef}
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

              {/* Password strength meter */}
              {form.password && strength && (
                <div style={{ marginTop: "10px" }}>
                  {/* Strength bar */}
                  <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} style={{
                        flex: 1, height: "4px", borderRadius: "99px",
                        background: n <= strength.score ? strength.color : "var(--color-hairline-strong)",
                        transition: "background 0.2s",
                      }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.75rem", color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                  </div>
                  {/* Rules */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {PASSWORD_RULES.map((rule) => (
                      <div
                        key={rule.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.75rem",
                          color: rule.test(form.password) ? "#16a34a" : "var(--color-ash)",
                          fontWeight: 500,
                        }}
                      >
                        <div style={{
                          width: "14px", height: "14px", borderRadius: "50%",
                          background: rule.test(form.password) ? "#dcfce7" : "var(--color-surface-card)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          {rule.test(form.password)
                            ? <CheckIcon size={9} strokeWidth={3} />
                            : <span style={{ fontSize: "8px", color: "var(--color-ash)" }}>—</span>
                          }
                        </div>
                        {rule.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Altcha CAPTCHA */}
            <div>
              <AltchaWidget name="altcha" />
            </div>

            <button
              type="submit"
              disabled={loading || !form.email || !form.password}
              className="btn btn-primary btn-pill"
              style={{
                justifyContent: "center", marginTop: "4px",
                background: "linear-gradient(135deg, #3a3aef 0%, #8b5cf6 100%)",
                border: "none",
              }}
            >
              {loading ? "계정 생성 중..." : "무료 계정 만들기"}
            </button>
          </form>

          {/* Security notice */}
          <div style={{
            marginTop: "16px",
            padding: "12px 14px",
            background: "var(--color-surface-card)",
            borderRadius: "8px",
            display: "flex", alignItems: "flex-start", gap: "8px",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-muted)", flexShrink: 0, marginTop: "1px" }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
              개인정보는 <strong style={{ color: "var(--color-ink)" }}>암호화</strong>되어 저장됩니다.
              제3자에게 판매하지 않습니다.
            </p>
          </div>

          <div
            style={{
              marginTop: "16px",
              paddingTop: "16px",
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
            marginTop: "20px",
            padding: "20px 24px",
            background: "var(--color-lifted)",
            border: "1px solid var(--color-hairline)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <p
            style={{
              fontSize: "0.8125rem",
              fontWeight: 700,
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
              <div style={{
                width: "16px", height: "16px", borderRadius: "50%",
                background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <CheckIcon size={10} strokeWidth={3} />
              </div>
              {benefit}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
