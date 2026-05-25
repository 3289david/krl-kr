"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LinkIcon, QrCodeIcon, ShieldIcon, ClockIcon,
  GlobeIcon, SmartphoneIcon, BarChartIcon, AlertCircleIcon,
} from "@/components/icons";

interface FormData {
  url: string;
  slug: string;
  title: string;
  description: string;
  password: string;
  expires_at: string;
  max_clicks: string;
  is_dynamic: boolean;
  ios_url: string;
  android_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
}

const INITIAL_FORM: FormData = {
  url: "",
  slug: "",
  title: "",
  description: "",
  password: "",
  expires_at: "",
  max_clicks: "",
  is_dynamic: false,
  ios_url: "",
  android_url: "",
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
};

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 16px",
        borderRadius: "var(--radius-sm)",
        border: "none",
        background: active ? "var(--color-surface-card)" : "transparent",
        color: active ? "var(--color-ink)" : "var(--color-muted)",
        fontSize: "0.9rem",
        fontWeight: active ? 500 : 400,
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        transition: "all 0.1s ease",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

export default function NewLinkPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [activeTab, setActiveTab] = useState<"basic" | "options" | "advanced">("basic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ short_url: string; slug: string; qr_url: string } | null>(null);

  function updateForm(key: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload: Record<string, unknown> = {
        url: form.url,
        is_dynamic: form.is_dynamic,
      };

      if (form.slug.trim()) payload.slug = form.slug.trim();
      if (form.title.trim()) payload.title = form.title.trim();
      if (form.description.trim()) payload.description = form.description.trim();
      if (form.password.trim()) payload.password = form.password.trim();
      if (form.expires_at) payload.expires_at = new Date(form.expires_at).toISOString();
      if (form.max_clicks) payload.max_clicks = parseInt(form.max_clicks);
      if (form.ios_url.trim()) payload.ios_url = form.ios_url.trim();
      if (form.android_url.trim()) payload.android_url = form.android_url.trim();
      if (form.utm_source.trim()) payload.utm_source = form.utm_source.trim();
      if (form.utm_medium.trim()) payload.utm_medium = form.utm_medium.trim();
      if (form.utm_campaign.trim()) payload.utm_campaign = form.utm_campaign.trim();

      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "링크 생성에 실패했습니다.");

      setResult({
        short_url: data.short_url,
        slug: data.link.slug,
        qr_url: data.qr_url,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div style={{ padding: "32px", maxWidth: "600px" }}>
        <div
          style={{
            background: "var(--color-lifted)",
            border: "1px solid var(--color-hairline-strong)",
            borderRadius: "var(--radius-xl)",
            padding: "40px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "#ECFDF5",
              border: "1px solid #A7F3D0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              color: "var(--color-success)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "8px" }}>
            링크가 생성되었습니다!
          </h2>
          <p style={{ color: "var(--color-muted)", marginBottom: "28px", fontSize: "0.9rem" }}>
            단축 링크가 성공적으로 생성되었습니다.
          </p>

          <div
            className="copy-field"
            style={{ marginBottom: "20px", justifyContent: "space-between" }}
          >
            <span>{result.short_url}</span>
            <button
              onClick={() => navigator.clipboard.writeText(result.short_url)}
              className="btn btn-ghost btn-sm"
              style={{ padding: "4px 12px", fontSize: "0.8125rem" }}
            >
              복사
            </button>
          </div>

          {/* QR Preview */}
          <div className="qr-preview" style={{ marginBottom: "24px" }}>
            <img
              src={result.qr_url}
              alt={`QR Code for ${result.short_url}`}
              width={160}
              height={160}
            />
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href={result.qr_url + "?format=png"}
              download={`qr-${result.slug}.png`}
              className="btn btn-secondary btn-sm btn-pill"
              style={{ textDecoration: "none" }}
            >
              QR 다운로드
            </a>
            <Link
              href={`/dashboard/links/${result.slug}/analytics`}
              className="btn btn-secondary btn-sm btn-pill"
              style={{ textDecoration: "none" }}
            >
              분석 보기
            </Link>
            <button
              onClick={() => { setResult(null); setForm(INITIAL_FORM); }}
              className="btn btn-primary btn-sm btn-pill"
            >
              새 링크 만들기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <Link
          href="/dashboard"
          style={{
            fontSize: "0.875rem",
            color: "var(--color-muted)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginBottom: "16px",
          }}
        >
          ← 대시보드
        </Link>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "4px" }}>
          새 링크 만들기
        </h1>
        <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>
          단축 링크를 생성하고 커스터마이즈하세요.
        </p>
      </div>

      <div style={{ maxWidth: "680px" }}>
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

        {/* Tab navigation */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "24px",
            background: "var(--color-lifted)",
            padding: "4px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-hairline)",
            width: "fit-content",
          }}
        >
          <TabButton
            active={activeTab === "basic"}
            onClick={() => setActiveTab("basic")}
            icon={<LinkIcon size={15} />}
            label="기본"
          />
          <TabButton
            active={activeTab === "options"}
            onClick={() => setActiveTab("options")}
            icon={<ShieldIcon size={15} />}
            label="옵션"
          />
          <TabButton
            active={activeTab === "advanced"}
            onClick={() => setActiveTab("advanced")}
            icon={<BarChartIcon size={15} />}
            label="고급"
          />
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic tab */}
          {activeTab === "basic" && (
            <div
              style={{
                background: "var(--color-lifted)",
                border: "1px solid var(--color-hairline)",
                borderRadius: "var(--radius-xl)",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <div>
                <label
                  htmlFor="url"
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    marginBottom: "6px",
                  }}
                >
                  원본 URL *
                </label>
                <input
                  id="url"
                  type="url"
                  value={form.url}
                  onChange={(e) => updateForm("url", e.target.value)}
                  placeholder="https://example.com/very-long-url"
                  required
                  className="input"
                />
              </div>

              <div>
                <label
                  htmlFor="slug"
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    marginBottom: "6px",
                  }}
                >
                  커스텀 슬러그 (선택)
                </label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      padding: "10px 14px",
                      background: "var(--color-surface-card)",
                      border: "1px solid var(--color-hairline-strong)",
                      borderRight: "none",
                      borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)",
                      fontSize: "0.9375rem",
                      color: "var(--color-muted)",
                      fontFamily: "var(--font-mono)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    krl.kr/
                  </span>
                  <input
                    id="slug"
                    type="text"
                    value={form.slug}
                    onChange={(e) => updateForm("slug", e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    placeholder="my-link"
                    className="input"
                    style={{ borderRadius: "0 var(--radius-sm) var(--radius-sm) 0" }}
                    maxLength={64}
                    pattern="[a-zA-Z0-9_-]+"
                  />
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--color-ash)", marginTop: "4px" }}>
                  영문자, 숫자, 하이픈(-), 언더스코어(_) 사용 가능. 비워두면 자동 생성.
                </p>
              </div>

              <div>
                <label
                  htmlFor="title"
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    marginBottom: "6px",
                  }}
                >
                  제목 (선택)
                </label>
                <input
                  id="title"
                  type="text"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="링크 제목 (내부 관리용)"
                  className="input"
                  maxLength={200}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  id="is_dynamic"
                  type="checkbox"
                  checked={form.is_dynamic}
                  onChange={(e) => updateForm("is_dynamic", e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="is_dynamic" style={{ fontSize: "0.9rem", cursor: "pointer" }}>
                  <strong>다이나믹 링크</strong>
                  <span style={{ color: "var(--color-muted)", marginLeft: "6px", fontSize: "0.8125rem" }}>
                    — 목적지 URL을 나중에 변경 가능 (QR 코드 재생성 불필요)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Options tab */}
          {activeTab === "options" && (
            <div
              style={{
                background: "var(--color-lifted)",
                border: "1px solid var(--color-hairline)",
                borderRadius: "var(--radius-xl)",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500 }}>
                  <ShieldIcon size={16} />
                  비밀번호 보호
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateForm("password", e.target.value)}
                  placeholder="비밀번호 (선택)"
                  className="input"
                  maxLength={100}
                />
                <p style={{ fontSize: "0.75rem", color: "var(--color-ash)", marginTop: "4px" }}>
                  설정 시 방문자가 비밀번호를 입력해야 링크에 접근할 수 있습니다.
                </p>
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500 }}>
                  <ClockIcon size={16} />
                  만료 날짜
                </label>
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => updateForm("expires_at", e.target.value)}
                  className="input"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p style={{ fontSize: "0.75rem", color: "var(--color-ash)", marginTop: "4px" }}>
                  설정 시 해당 날짜/시간 이후에는 링크가 만료됩니다.
                </p>
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", fontSize: "0.875rem", fontWeight: 500 }}>
                  최대 클릭 수
                </label>
                <input
                  type="number"
                  value={form.max_clicks}
                  onChange={(e) => updateForm("max_clicks", e.target.value)}
                  placeholder="무제한 (선택)"
                  className="input"
                  min={1}
                />
                <p style={{ fontSize: "0.75rem", color: "var(--color-ash)", marginTop: "4px" }}>
                  설정 시 해당 횟수만큼 클릭하면 링크가 비활성화됩니다.
                </p>
              </div>
            </div>
          )}

          {/* Advanced tab */}
          {activeTab === "advanced" && (
            <div
              style={{
                background: "var(--color-lifted)",
                border: "1px solid var(--color-hairline)",
                borderRadius: "var(--radius-xl)",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                gap: "24px",
              }}
            >
              {/* App links */}
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", fontSize: "0.875rem", fontWeight: 600 }}>
                  <SmartphoneIcon size={16} />
                  앱 링크 (Deep Link)
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <input
                    type="text"
                    value={form.ios_url}
                    onChange={(e) => updateForm("ios_url", e.target.value)}
                    placeholder="iOS URL (App Store 또는 Universal Link)"
                    className="input"
                  />
                  <input
                    type="text"
                    value={form.android_url}
                    onChange={(e) => updateForm("android_url", e.target.value)}
                    placeholder="Android URL (Play Store 또는 앱 링크)"
                    className="input"
                  />
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--color-ash)", marginTop: "6px" }}>
                  iOS/Android 기기에서 접속 시 해당 URL로 분기합니다.
                </p>
              </div>

              {/* UTM params */}
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", fontSize: "0.875rem", fontWeight: 600 }}>
                  <GlobeIcon size={16} />
                  UTM 파라미터
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <input
                    type="text"
                    value={form.utm_source}
                    onChange={(e) => updateForm("utm_source", e.target.value)}
                    placeholder="utm_source (예: instagram)"
                    className="input"
                  />
                  <input
                    type="text"
                    value={form.utm_medium}
                    onChange={(e) => updateForm("utm_medium", e.target.value)}
                    placeholder="utm_medium (예: social)"
                    className="input"
                  />
                  <input
                    type="text"
                    value={form.utm_campaign}
                    onChange={(e) => updateForm("utm_campaign", e.target.value)}
                    placeholder="utm_campaign (예: spring-sale)"
                    className="input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "20px",
              alignItems: "center",
            }}
          >
            <button
              type="submit"
              disabled={loading || !form.url}
              className="btn btn-primary btn-pill"
              style={{ gap: "6px" }}
            >
              {loading ? "생성 중..." : (
                <>
                  <LinkIcon size={16} />
                  링크 생성
                </>
              )}
            </button>
            <Link
              href="/dashboard"
              className="btn btn-ghost btn-pill"
              style={{ textDecoration: "none" }}
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
