"use client";
import { useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { LockIcon, EyeIcon, EyeOffIcon } from "@/components/icons";

function LockedForm() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;
  const hasError = searchParams.get("error") === "1";

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    router.push(`/${slug}?p=${encodeURIComponent(password)}`);
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
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          background: "var(--color-lifted)",
          border: "1px solid var(--color-hairline-strong)",
          borderRadius: "var(--radius-xl)",
          padding: "40px 36px",
          textAlign: "center",
        }}
      >
        {/* Lock icon */}
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: "var(--color-surface-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            color: "var(--color-ink)",
          }}
        >
          <LockIcon size={22} />
        </div>

        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            marginBottom: "8px",
          }}
        >
          비밀번호가 필요합니다
        </h1>
        <p
          style={{
            fontSize: "0.9rem",
            color: "var(--color-muted)",
            marginBottom: "28px",
          }}
        >
          이 링크는 비밀번호로 보호되어 있습니다.
        </p>

        {hasError && (
          <div
            style={{
              padding: "10px 14px",
              background: "#FFF1F2",
              border: "1px solid #FECDD3",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.875rem",
              color: "#9B1C1C",
              marginBottom: "16px",
              textAlign: "left",
            }}
          >
            비밀번호가 올바르지 않습니다.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="input"
              autoFocus
              style={{ paddingRight: "44px", textAlign: "left" }}
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

          <button
            type="submit"
            disabled={loading || !password}
            className="btn btn-primary btn-pill"
            style={{ justifyContent: "center" }}
          >
            {loading ? "확인 중..." : "확인"}
          </button>
        </form>

        <p
          style={{
            marginTop: "24px",
            fontSize: "0.8125rem",
            color: "var(--color-ash)",
          }}
        >
          <a href="https://krl.kr" style={{ color: "var(--color-muted)" }}>
            KRL.KR
          </a>
          로 돌아가기
        </p>
      </div>
    </div>
  );
}

export default function LockedPage() {
  return (
    <Suspense fallback={null}>
      <LockedForm />
    </Suspense>
  );
}
