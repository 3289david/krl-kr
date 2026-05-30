"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────
type Lang = "curl" | "js" | "python";

// ── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); } catch { return; }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button
      onClick={copy}
      title="복사"
      style={{
        position: "absolute", top: "10px", right: "12px",
        background: copied ? "rgba(48,209,88,.15)" : "rgba(255,255,255,.08)",
        border: "1px solid " + (copied ? "rgba(48,209,88,.4)" : "rgba(255,255,255,.12)"),
        borderRadius: "6px", padding: "4px 10px", cursor: "pointer",
        fontSize: "0.7rem", fontFamily: "var(--font-mono)",
        color: copied ? "#30d158" : "rgba(243,240,238,.55)",
        transition: "all .15s", display: "flex", alignItems: "center", gap: "5px",
      }}
    >
      {copied
        ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>복사됨</>
        : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>복사</>
      }
    </button>
  );
}

// ── Code block ───────────────────────────────────────────────────────────────
function Block({ label, code }: { label?: string; code: string }) {
  return (
    <div style={{ position: "relative", background: "var(--color-surface-dark)", borderRadius: "10px", overflow: "hidden", margin: "14px 0" }}>
      {label && (
        <div style={{ padding: "7px 16px", borderBottom: "1px solid rgba(255,255,255,.07)", fontSize: "0.7rem", color: "rgba(243,240,238,.35)", fontFamily: "var(--font-mono)", letterSpacing: ".03em" }}>
          {label}
        </div>
      )}
      <pre style={{ padding: "16px 18px", paddingRight: "72px", margin: 0, fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "#e8e4e1", overflowX: "auto", lineHeight: 1.7, tabSize: 2 }}>
        {code.trim()}
      </pre>
      <CopyButton text={code.trim()} />
    </div>
  );
}

// ── Language tabs ────────────────────────────────────────────────────────────
function LangBlock({ examples }: { examples: Partial<Record<Lang, string>> }) {
  const langs = Object.keys(examples) as Lang[];
  const [active, setActive] = useState<Lang>(langs[0]);
  const labels: Record<Lang, string> = { curl: "cURL", js: "JavaScript", python: "Python" };
  return (
    <div style={{ background: "var(--color-surface-dark)", borderRadius: "10px", overflow: "hidden", margin: "14px 0" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        {langs.map((l) => (
          <button key={l} onClick={() => setActive(l)} style={{
            padding: "8px 16px", background: "none", border: "none", cursor: "pointer",
            fontSize: "0.75rem", fontFamily: "var(--font-mono)", letterSpacing: ".02em",
            color: active === l ? "#e8e4e1" : "rgba(243,240,238,.4)",
            borderBottom: active === l ? "2px solid #e8e4e1" : "2px solid transparent",
            transition: "color .15s",
          }}>{labels[l]}</button>
        ))}
      </div>
      {/* Code */}
      <div style={{ position: "relative" }}>
        <pre style={{ padding: "16px 18px", paddingRight: "72px", margin: 0, fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "#e8e4e1", overflowX: "auto", lineHeight: 1.7 }}>
          {(examples[active] ?? "").trim()}
        </pre>
        <CopyButton text={(examples[active] ?? "").trim()} />
      </div>
    </div>
  );
}

// ── HTTP method badge ─────────────────────────────────────────────────────────
const METHOD_COLORS: Record<string, string> = {
  GET: "#30d158", POST: "#F37338", PUT: "#FFBD2E",
  PATCH: "#FFBD2E", DELETE: "#FF5F57", OPTIONS: "#a8a29e",
};
function Method({ m }: { m: string }) {
  const color = METHOD_COLORS[m] ?? "#a8a29e";
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.75rem", color, background: color + "20", padding: "2px 8px", borderRadius: "5px", flexShrink: 0 }}>
      {m}
    </span>
  );
}

// ── Endpoint card ─────────────────────────────────────────────────────────────
function Endpoint({ method, path, desc, auth, children }: {
  method: string; path: string; desc: string; auth?: boolean; children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hasDetails = !!children;
  return (
    <div style={{ border: "1px solid var(--color-hairline)", borderRadius: "10px", marginBottom: "10px", overflow: "hidden" }}>
      <div
        onClick={hasDetails ? () => setOpen((o) => !o) : undefined}
        style={{
          padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px",
          cursor: hasDetails ? "pointer" : "default",
          background: open ? "var(--color-surface-card)" : "transparent",
          transition: "background .15s",
        }}
      >
        <Method m={method} />
        <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--color-ink)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {path}
        </code>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {auth && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "var(--color-muted)", background: "var(--color-surface-card)", padding: "2px 7px", borderRadius: "99px" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              인증
            </span>
          )}
          {hasDetails && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", color: "var(--color-muted)" }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </div>
      </div>
      {!open && (
        <div style={{ padding: "0 18px 12px", fontSize: "0.875rem", color: "var(--color-muted)" }}>{desc}</div>
      )}
      {open && hasDetails && (
        <div style={{ borderTop: "1px solid var(--color-hairline)", padding: "18px 18px 4px" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "12px" }}>{desc}</p>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Parameter table ───────────────────────────────────────────────────────────
function ParamTable({ rows }: { rows: [string, string, boolean, string][] }) {
  return (
    <div style={{ border: "1px solid var(--color-hairline)", borderRadius: "8px", overflow: "hidden", marginBottom: "14px", fontSize: "0.8125rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "160px 100px 70px 1fr", padding: "8px 14px", background: "var(--color-surface-card)", borderBottom: "1px solid var(--color-hairline)", color: "var(--color-muted)", fontWeight: 600, fontSize: "0.7rem", letterSpacing: ".04em", textTransform: "uppercase" }}>
        <span>파라미터</span><span>타입</span><span>필수</span><span>설명</span>
      </div>
      {rows.map(([name, type, required, desc], i) => (
        <div key={name} style={{ display: "grid", gridTemplateColumns: "160px 100px 70px 1fr", padding: "9px 14px", borderBottom: i < rows.length - 1 ? "1px solid var(--color-hairline)" : "none", alignItems: "start", gap: "8px" }}>
          <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--color-ink)" }}>{name}</code>
          <span style={{ color: "#F37338", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{type}</span>
          <span style={{ color: required ? "#30d158" : "var(--color-ash)", fontSize: "0.75rem" }}>{required ? "필수" : "선택"}</span>
          <span style={{ color: "var(--color-body)", lineHeight: 1.5 }}>{desc}</span>
        </div>
      ))}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ id, title, badge, children }: { id: string; title: string; badge?: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: "72px", scrollMarginTop: "90px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid var(--color-hairline)" }}>
        <h2 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>{title}</h2>
        {badge && <span style={{ fontSize: "0.7rem", fontWeight: 700, background: "var(--color-surface-card)", color: "var(--color-muted)", padding: "2px 8px", borderRadius: "99px", letterSpacing: ".03em", textTransform: "uppercase" }}>{badge}</span>}
      </div>
      {children}
    </section>
  );
}

// ── Alert ─────────────────────────────────────────────────────────────────────
function Alert({ type = "info", children }: { type?: "info" | "warn" | "tip"; children: React.ReactNode }) {
  const styles = {
    info:  { bg: "#EFF6FF", border: "#BFDBFE", color: "#1E40AF", icon: "ℹ" },
    warn:  { bg: "#FFF7ED", border: "#FED7AA", color: "#92400E", icon: "⚠" },
    tip:   { bg: "#F0FDF4", border: "#BBF7D0", color: "#14532D", icon: "✦" },
  }[type];
  return (
    <div style={{ padding: "12px 16px", background: styles.bg, border: `1px solid ${styles.border}`, borderRadius: "8px", fontSize: "0.875rem", color: styles.color, lineHeight: 1.6, marginBottom: "16px", display: "flex", gap: "10px" }}>
      <span style={{ flexShrink: 0, fontWeight: 700 }}>{styles.icon}</span>
      <div>{children}</div>
    </div>
  );
}

// ── TOC ───────────────────────────────────────────────────────────────────────
const TOC = [
  { id: "intro",      label: "시작하기" },
  { id: "auth",       label: "인증" },
  { id: "ratelimit",  label: "요청 한도" },
  { id: "shorten",    label: "URL 단축" },
  { id: "links",      label: "링크 관리" },
  { id: "analytics",  label: "분석" },
  { id: "qr",         label: "QR 코드" },
  { id: "paste",      label: "Pastebin" },
  { id: "files",      label: "파일 공유" },
  { id: "email",      label: "이메일 별칭" },
  { id: "subdomains", label: "서브도메인" },
  { id: "community",  label: "커뮤니티" },
  { id: "search",     label: "검색" },
  { id: "ai",         label: "AI 채팅" },
  { id: "keys",       label: "API 키 관리" },
  { id: "errors",     label: "오류 코드" },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DocsContent() {
  const [activeId, setActiveId] = useState("intro");
  const mainRef = useRef<HTMLDivElement>(null);

  // Highlight active TOC section on scroll
  useEffect(() => {
    const ids = TOC.map((t) => t.id);
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveId(e.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "64px 24px 120px" }}>
      <div ref={mainRef} style={{ display: "grid", gridTemplateColumns: "216px 1fr", gap: "64px", alignItems: "start" }}>

        {/* ── Sidebar ── */}
        <aside style={{ position: "sticky", top: "88px" }}>
          {/* Header */}
          <div style={{ marginBottom: "24px" }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: "4px" }}>
              KRL.KR
            </p>
            <p style={{ fontSize: "1.0625rem", fontWeight: 700, letterSpacing: "-0.01em" }}>API Reference</p>
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {TOC.map((item) => (
              <a key={item.id} href={`#${item.id}`} style={{
                display: "block", padding: "6px 10px", borderRadius: "7px",
                fontSize: "0.875rem", textDecoration: "none", transition: "all .12s",
                color: activeId === item.id ? "var(--color-ink)" : "var(--color-body)",
                background: activeId === item.id ? "var(--color-surface-card)" : "transparent",
                fontWeight: activeId === item.id ? 600 : 400,
                borderLeft: activeId === item.id ? "2px solid var(--color-ink)" : "2px solid transparent",
              }}>
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div style={{ marginTop: "28px", padding: "16px", background: "var(--color-lifted)", borderRadius: "10px", border: "1px solid var(--color-hairline)" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "6px" }}>API 키 발급</p>
            <p style={{ fontSize: "0.775rem", color: "var(--color-muted)", marginBottom: "12px", lineHeight: 1.5 }}>무료 계정으로 하루 100회 API 사용</p>
            <Link href="/dashboard/api-keys" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px 12px", background: "var(--color-ink)", color: "var(--color-canvas)", borderRadius: "7px", textDecoration: "none", fontSize: "0.8125rem", fontWeight: 600 }}>
              대시보드 →
            </Link>
          </div>

          {/* llms.txt */}
          <a href="/llms.txt" style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "12px", padding: "8px 10px", borderRadius: "7px", fontSize: "0.775rem", color: "var(--color-muted)", textDecoration: "none", border: "1px solid var(--color-hairline)", background: "var(--color-lifted)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            llms.txt — AI용 참조
          </a>
        </aside>

        {/* ── Main content ── */}
        <main>
          {/* Hero */}
          <div style={{ marginBottom: "60px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-muted)" }}>
              REST API v1
            </span>
            <h1 style={{ fontSize: "2.25rem", fontWeight: 700, letterSpacing: "-0.03em", margin: "8px 0 14px" }}>
              KRL.KR API 문서
            </h1>
            <p style={{ fontSize: "1.0625rem", color: "var(--color-muted)", lineHeight: 1.7, maxWidth: "580px", marginBottom: "24px" }}>
              URL 단축, QR 생성, 파일 공유, 이메일 별칭, 서브도메인 등 모든 기능을 REST API로 사용하세요.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ padding: "10px 16px", background: "var(--color-surface-dark)", borderRadius: "8px", fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "#e8e4e1", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "rgba(243,240,238,.4)", fontSize: "0.75rem" }}>BASE URL</span>
                https://krl.kr/api/v1
              </div>
              <div style={{ padding: "10px 16px", background: "var(--color-surface-dark)", borderRadius: "8px", fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "#e8e4e1", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "rgba(243,240,238,.4)", fontSize: "0.75rem" }}>FORMAT</span>
                application/json
              </div>
            </div>
          </div>

          {/* ── 시작하기 ── */}
          <Section id="intro" title="시작하기">
            <p style={{ color: "var(--color-body)", lineHeight: 1.75, marginBottom: "16px" }}>
              일부 엔드포인트(URL 단축, QR 코드 등)는 인증 없이 사용할 수 있습니다. 링크 관리, 분석 등 고급 기능은{" "}
              <Link href="/dashboard/api-keys" style={{ color: "var(--color-ink)", textDecoration: "underline" }}>API 키</Link>가 필요합니다.
            </p>
            <LangBlock examples={{
              curl: `# URL 단축 — 인증 없이 사용 가능
curl -X POST https://krl.kr/api/v1/shorten \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/very-long-path"}'`,
              js: `// fetch로 URL 단축
const res = await fetch("https://krl.kr/api/v1/shorten", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://example.com/very-long-path" }),
});
const data = await res.json();
console.log(data.short_url); // "https://krl.kr/abc123"`,
              python: `import httpx

res = httpx.post(
    "https://krl.kr/api/v1/shorten",
    json={"url": "https://example.com/very-long-path"},
)
print(res.json()["short_url"])  # "https://krl.kr/abc123"`,
            }} />
            <Block label="응답" code={`{
  "id": "lnk_xxxxxxxxxxxx",
  "slug": "abc123",
  "short_url": "https://krl.kr/abc123",
  "original_url": "https://example.com/very-long-path",
  "qr_url": "https://krl.kr/api/qr/abc123",
  "created_at": "2026-01-01T00:00:00.000Z",
  "expires_at": null,
  "has_password": false
}`} />
          </Section>

          {/* ── 인증 ── */}
          <Section id="auth" title="인증">
            <p style={{ color: "var(--color-body)", lineHeight: 1.75, marginBottom: "16px" }}>
              API 키는 <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.85em", background: "var(--color-surface-card)", padding: "1px 5px", borderRadius: "4px" }}>X-API-Key</code> 헤더로 전달합니다.{" "}
              <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.85em", background: "var(--color-surface-card)", padding: "1px 5px", borderRadius: "4px" }}>Authorization: Bearer</code>도 지원합니다.
            </p>
            <LangBlock examples={{
              curl: `curl https://krl.kr/api/v1/links \\
  -H "X-API-Key: krl_xxxxxxxxxxxxxxxxxxxx"`,
              js: `const res = await fetch("https://krl.kr/api/v1/links", {
  headers: { "X-API-Key": "krl_xxxxxxxxxxxxxxxxxxxx" },
});`,
              python: `import httpx

client = httpx.Client(headers={"X-API-Key": "krl_xxxxxxxxxxxxxxxxxxxx"})
res = client.get("https://krl.kr/api/v1/links")`,
            }} />
            <Alert type="warn">
              API 키는 서버 환경 변수에만 저장하세요. 클라이언트 코드나 Git에 노출하지 마세요.
            </Alert>
            <Alert type="tip">
              API 키가 노출된 경우 <Link href="/dashboard/api-keys" style={{ color: "inherit", fontWeight: 600, textDecoration: "underline" }}>대시보드</Link>에서 즉시 폐기하고 새로 발급하세요.
            </Alert>
          </Section>

          {/* ── 요청 한도 ── */}
          <Section id="ratelimit" title="요청 한도" badge="Rate Limits">
            <div style={{ border: "1px solid var(--color-hairline)", borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 160px", padding: "9px 16px", background: "var(--color-surface-card)", borderBottom: "1px solid var(--color-hairline)", fontSize: "0.7rem", fontWeight: 700, color: "var(--color-muted)", letterSpacing: ".04em", textTransform: "uppercase" }}>
                <span>대상</span><span>한도</span><span>초기화</span>
              </div>
              {[
                ["로그인 시도", "5회", "1분"],
                ["회원가입", "5회", "1시간"],
                ["URL 단축 (비회원)", "20회", "1분"],
                ["URL 단축 (API 키)", "3,000회", "1일"],
                ["일반 API 요청", "100회", "1일 (무료 플랜)"],
              ].map(([label, limit, reset], i, arr) => (
                <div key={label} style={{ display: "grid", gridTemplateColumns: "1fr 120px 160px", padding: "10px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--color-hairline)" : "none", fontSize: "0.875rem", alignItems: "center" }}>
                  <span style={{ color: "var(--color-body)" }}>{label}</span>
                  <span style={{ color: "var(--color-ink)", fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.8rem" }}>{limit}</span>
                  <span style={{ color: "var(--color-muted)" }}>{reset}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", lineHeight: 1.6 }}>
              한도 초과 시 <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.85em", background: "var(--color-surface-card)", padding: "1px 5px", borderRadius: "4px" }}>429 Too Many Requests</code>를 반환합니다.{" "}
              <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.85em", background: "var(--color-surface-card)", padding: "1px 5px", borderRadius: "4px" }}>Retry-After</code> 헤더에서 대기 시간을 확인하세요.
            </p>
          </Section>

          {/* ── URL 단축 ── */}
          <Section id="shorten" title="URL 단축">
            <Endpoint method="POST" path="/api/v1/shorten" desc="긴 URL을 단축합니다. 익명 사용 가능 (커스텀 슬러그는 API 키 필요)">
              <ParamTable rows={[
                ["url",          "string",  true,  "단축할 원본 URL (http:// 또는 https://)"],
                ["slug",         "string",  false, "커스텀 슬러그. 미지정 시 자동 생성 (영문자·숫자·하이픈)"],
                ["title",        "string",  false, "링크 제목 (최대 200자)"],
                ["password",     "string",  false, "비밀번호 보호. 접근 시 입력 필요"],
                ["expires_at",   "string",  false, "만료 일시 (ISO 8601 형식)"],
                ["max_clicks",   "number",  false, "최대 클릭 수 초과 시 비활성화"],
                ["is_dynamic",   "boolean", false, "true 시 목적지 URL을 나중에 변경 가능"],
                ["ios_url",      "string",  false, "iOS 기기용 딥링크 URL"],
                ["android_url",  "string",  false, "Android 기기용 딥링크 URL"],
                ["utm_source",   "string",  false, "UTM 소스 파라미터 자동 추가"],
                ["utm_medium",   "string",  false, "UTM 매체 파라미터"],
                ["utm_campaign", "string",  false, "UTM 캠페인 파라미터"],
              ]} />
              <LangBlock examples={{
                curl: `curl -X POST https://krl.kr/api/v1/shorten \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: krl_xxxx" \\
  -d '{
    "url": "https://example.com/product/detail?id=42",
    "slug": "product42",
    "title": "제품 상세 페이지",
    "expires_at": "2026-12-31T23:59:59Z",
    "utm_source": "newsletter",
    "utm_medium": "email"
  }'`,
                js: `const res = await fetch("https://krl.kr/api/v1/shorten", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "krl_xxxx",
  },
  body: JSON.stringify({
    url: "https://example.com/product/detail?id=42",
    slug: "product42",
    expires_at: "2026-12-31T23:59:59Z",
  }),
});
const { short_url, qr_url } = await res.json();`,
                python: `import httpx

res = httpx.post(
    "https://krl.kr/api/v1/shorten",
    headers={"X-API-Key": "krl_xxxx"},
    json={
        "url": "https://example.com/product/detail?id=42",
        "slug": "product42",
        "expires_at": "2026-12-31T23:59:59Z",
    },
)
data = res.json()
print(data["short_url"])`,
              }} />
              <Block label="응답 201" code={`{
  "id": "lnk_xxxxxxxxxxxx",
  "slug": "product42",
  "short_url": "https://krl.kr/product42",
  "original_url": "https://example.com/product/detail?id=42",
  "qr_url": "https://krl.kr/api/qr/product42",
  "created_at": "2026-01-01T00:00:00.000Z",
  "expires_at": "2026-12-31T23:59:59.000Z",
  "has_password": false
}`} />
            </Endpoint>
          </Section>

          {/* ── 링크 관리 ── */}
          <Section id="links" title="링크 관리">
            <Endpoint method="GET" path="/api/v1/links" desc="내 링크 목록을 가져옵니다. 페이지네이션 및 검색 지원." auth>
              <ParamTable rows={[
                ["page",        "number",  false, "페이지 번호 (기본값: 1)"],
                ["limit",       "number",  false, "페이지당 개수 (기본값: 20, 최대: 100)"],
                ["q",           "string",  false, "슬러그·URL·제목 검색어"],
                ["is_dynamic",  "1",       false, "1 시 다이나믹 링크만 필터"],
                ["has_expiry",  "1",       false, "1 시 만료 또는 클릭 제한이 있는 링크만"],
              ]} />
              <Block label="응답" code={`{
  "links": [
    {
      "id": "lnk_xxxxxxxxxxxx",
      "slug": "product42",
      "original_url": "https://example.com",
      "title": "제품 페이지",
      "click_count": 1024,
      "unique_count": 856,
      "is_active": true,
      "expires_at": null,
      "created_at": 1735689600000
    }
  ],
  "total": 42,
  "page": 1,
  "pages": 3,
  "limit": 20
}`} />
            </Endpoint>

            <Endpoint method="GET" path="/api/v1/links/:id" desc="특정 링크의 상세 정보를 가져옵니다." auth />

            <Endpoint method="PATCH" path="/api/v1/links/:id" desc="링크의 URL, 제목, 만료일 등을 수정합니다." auth>
              <ParamTable rows={[
                ["url",        "string",  false, "변경할 목적지 URL"],
                ["title",      "string",  false, "링크 제목"],
                ["expires_at", "string",  false, "만료 일시 (ISO 8601). null 로 제거"],
                ["max_clicks", "number",  false, "최대 클릭 수. null 로 제거"],
                ["is_active",  "boolean", false, "활성/비활성 전환"],
                ["password",   "string",  false, "비밀번호 변경. 빈 문자열로 제거"],
              ]} />
              <LangBlock examples={{
                curl: `curl -X PATCH https://krl.kr/api/v1/links/lnk_xxxxxxxxxxxx \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: krl_xxxx" \\
  -d '{
    "url": "https://new-destination.com",
    "title": "새 제목",
    "expires_at": "2027-01-01T00:00:00Z"
  }'`,
                js: `await fetch(\`https://krl.kr/api/v1/links/\${linkId}\`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", "X-API-Key": "krl_xxxx" },
  body: JSON.stringify({ url: "https://new-destination.com" }),
});`,
                python: `client.patch(
    f"https://krl.kr/api/v1/links/{link_id}",
    json={"url": "https://new-destination.com"},
)`,
              }} />
            </Endpoint>

            <Endpoint method="DELETE" path="/api/v1/links/:id" desc="링크를 영구 삭제합니다. 복구 불가." auth />
          </Section>

          {/* ── 분석 ── */}
          <Section id="analytics" title="분석">
            <Endpoint method="GET" path="/api/v1/links/:id/stats" desc="링크별 클릭 통계. 국가·기기·브라우저·날짜별 집계를 반환합니다." auth>
              <ParamTable rows={[
                ["days", "number", false, "집계 기간 (기본값: 30, 최대: 365)"],
              ]} />
              <Block label="응답" code={`{
  "total_clicks": 1024,
  "unique_clicks": 856,
  "by_country": [
    { "country": "KR", "clicks": 800 },
    { "country": "US", "clicks": 120 }
  ],
  "by_device": [
    { "device_type": "mobile", "clicks": 620 },
    { "device_type": "desktop", "clicks": 380 }
  ],
  "by_browser": [
    { "browser": "Chrome", "clicks": 512 },
    { "browser": "Safari", "clicks": 310 }
  ],
  "by_date": [
    { "date": "2026-01-01", "clicks": 42 },
    { "date": "2026-01-02", "clicks": 67 }
  ]
}`} />
            </Endpoint>
          </Section>

          {/* ── QR 코드 ── */}
          <Section id="qr" title="QR 코드">
            <Endpoint method="GET" path="/api/qr/:slug" desc="슬러그의 QR 코드 이미지를 반환합니다. SVG(기본) 또는 PNG.">
              <ParamTable rows={[
                ["format", "svg|png", false, "이미지 형식 (기본값: svg)"],
                ["size",   "number",  false, "PNG 크기 픽셀 (기본값: 300)"],
                ["margin", "number",  false, "여백 크기 (기본값: 1)"],
              ]} />
              <Block label="HTML에서 직접 사용" code={`<!-- SVG (기본) -->
<img src="https://krl.kr/api/qr/my-link" />

<!-- PNG 400px -->
<img src="https://krl.kr/api/qr/my-link?format=png&size=400" />

<!-- 여백 없이 -->
<img src="https://krl.kr/api/qr/my-link?margin=0" />`} />
            </Endpoint>

            <Endpoint method="GET" path="/api/v1/qr" desc="내 QR 코드 목록 조회" auth />
            <Endpoint method="POST" path="/api/v1/qr" desc="커스텀 스타일 QR 코드 생성" auth>
              <ParamTable rows={[
                ["url",          "string",  true,  "QR에 인코딩할 URL"],
                ["title",        "string",  false, "QR 코드 이름"],
                ["fg_color",     "string",  false, "전경색 (HEX, 기본: #000000)"],
                ["bg_color",     "string",  false, "배경색 (HEX, 기본: #FFFFFF)"],
                ["include_logo", "boolean", false, "KRL.KR 로고 중앙 삽입 여부"],
              ]} />
            </Endpoint>
          </Section>

          {/* ── Pastebin ── */}
          <Section id="paste" title="Pastebin">
            <Endpoint method="POST" path="/api/v1/paste" desc="텍스트 또는 코드를 단축 링크로 공유합니다. 익명 사용 가능.">
              <ParamTable rows={[
                ["content",    "string",  true,  "공유할 텍스트 내용 (최대 500KB)"],
                ["title",      "string",  false, "페이스트 제목"],
                ["language",   "string",  false, "언어 (text, js, python, sql, …)"],
                ["expires_in", "number",  false, "만료 시간 (초). 미설정 시 영구"],
                ["password",   "string",  false, "비밀번호 보호"],
                ["is_public",  "boolean", false, "공개 목록에 표시 여부 (기본: false)"],
              ]} />
              <LangBlock examples={{
                curl: `curl -X POST https://krl.kr/api/v1/paste \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "에러 로그",
    "content": "TypeError: Cannot read properties...",
    "language": "text",
    "expires_in": 86400
  }'`,
                js: `const res = await fetch("https://krl.kr/api/v1/paste", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "에러 로그",
    content: "TypeError: Cannot read properties...",
    expires_in: 86400,
  }),
});
const { url } = await res.json();`,
                python: `res = httpx.post(
    "https://krl.kr/api/v1/paste",
    json={
        "title": "에러 로그",
        "content": "TypeError: Cannot read properties...",
        "language": "python",
        "expires_in": 86400,
    },
)
print(res.json()["url"])`,
              }} />
              <Block label="응답 201" code={`{
  "id": "paste_xxxxxxxxxxxx",
  "slug": "abc123",
  "url": "https://krl.kr/p/abc123",
  "title": "에러 로그",
  "language": "text",
  "expires_at": "2026-01-02T00:00:00.000Z",
  "created_at": "2026-01-01T00:00:00.000Z"
}`} />
            </Endpoint>

            <Endpoint method="GET" path="/api/v1/paste/:slug" desc="페이스트 내용을 가져옵니다. 비밀번호 보호 시 ?p=비밀번호 추가." />
            <Endpoint method="DELETE" path="/api/v1/paste/:slug" desc="페이스트를 삭제합니다. 본인 소유만 가능." auth />
          </Section>

          {/* ── 파일 공유 ── */}
          <Section id="files" title="파일 공유">
            <Endpoint method="POST" path="/api/v1/files" desc="파일을 업로드하고 단축 링크를 받습니다." auth>
              <ParamTable rows={[
                ["file",           "File",   true,  "업로드할 파일 (multipart/form-data)"],
                ["expires_in",     "number", false, "만료 시간 (초)"],
                ["max_downloads",  "number", false, "최대 다운로드 횟수 초과 시 만료"],
                ["password",       "string", false, "다운로드 비밀번호"],
              ]} />
              <LangBlock examples={{
                curl: `curl -X POST https://krl.kr/api/v1/files \\
  -H "X-API-Key: krl_xxxx" \\
  -F "file=@report.pdf" \\
  -F "expires_in=604800" \\
  -F "max_downloads=10"`,
                js: `const form = new FormData();
form.append("file", fileInput.files[0]);
form.append("expires_in", "604800");

const res = await fetch("https://krl.kr/api/v1/files", {
  method: "POST",
  headers: { "X-API-Key": "krl_xxxx" },
  body: form,
});
const { url } = await res.json();`,
                python: `with open("report.pdf", "rb") as f:
    res = httpx.post(
        "https://krl.kr/api/v1/files",
        headers={"X-API-Key": "krl_xxxx"},
        files={"file": f},
        data={"expires_in": "604800"},
    )
print(res.json()["url"])`,
              }} />
              <Block label="응답 201" code={`{
  "slug": "abc123",
  "url": "https://krl.kr/f/abc123",
  "filename": "report.pdf",
  "content_type": "application/pdf",
  "size": 204800,
  "max_downloads": 10,
  "expires_at": "2026-01-08T00:00:00.000Z"
}`} />
            </Endpoint>

            <Endpoint method="GET" path="/api/v1/files" desc="업로드한 파일 목록. ?page=1&limit=20" auth />
            <Endpoint method="DELETE" path="/api/v1/files/:slug" desc="파일을 삭제합니다. 저장소에서 영구 제거됩니다." auth />
          </Section>

          {/* ── 이메일 별칭 ── */}
          <Section id="email" title="이메일 별칭">
            <Alert type="info">
              이메일 별칭을 생성하면 <strong>이름@krl.kr</strong> 주소로 이메일을 받을 수 있습니다. 수신 이메일은 인박스 API로 조회합니다.
            </Alert>

            <Endpoint method="GET" path="/api/v1/email" desc="내 이메일 별칭 목록" auth />

            <Endpoint method="POST" path="/api/v1/email" desc="새 이메일 별칭 생성" auth>
              <ParamTable rows={[
                ["alias", "string", true, "원하는 이름 (영문자·숫자·하이픈, 최대 32자). 예: danwoo → danwoo@krl.kr"],
              ]} />
              <LangBlock examples={{
                curl: `curl -X POST https://krl.kr/api/v1/email \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: krl_xxxx" \\
  -d '{"alias": "danwoo"}'`,
                js: `const res = await fetch("https://krl.kr/api/v1/email", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-API-Key": "krl_xxxx" },
  body: JSON.stringify({ alias: "danwoo" }),
});
// danwoo@krl.kr 생성됨`,
                python: `res = client.post(
    "https://krl.kr/api/v1/email",
    json={"alias": "danwoo"},
)
# danwoo@krl.kr 생성됨`,
              }} />
            </Endpoint>

            <Endpoint method="GET" path="/api/v1/email/inbox" desc="수신된 이메일 목록 조회" auth>
              <ParamTable rows={[
                ["alias", "string", false, "특정 별칭 필터 (미설정 시 모든 별칭)"],
                ["page",  "number", false, "페이지 번호"],
                ["limit", "number", false, "페이지당 개수 (최대 50)"],
              ]} />
            </Endpoint>

            <Endpoint method="DELETE" path="/api/v1/email?id=xxx" desc="이메일 별칭 삭제" auth />
          </Section>

          {/* ── 서브도메인 ── */}
          <Section id="subdomains" title="서브도메인">
            <Alert type="info">
              서브도메인을 생성하면 <strong>이름.krl.kr</strong>이 할당됩니다. GitHub Pages, Vercel, HTML 배포, 리다이렉트, A/AAAA/CNAME 직접 DNS 레코드 등 <strong>8가지 타입</strong>을 지원합니다.
            </Alert>

            <Endpoint method="GET" path="/api/v1/subdomains" desc="내 서브도메인 목록" auth />

            <Endpoint method="POST" path="/api/v1/subdomains" desc="새 서브도메인 생성" auth>
              <ParamTable rows={[
                ["subdomain", "string", true,  "서브도메인 이름 (소문자·숫자·하이픈, 최소 4자, 최대 63자)"],
                ["type",      "string", true,  "redirect | github | vercel | html | api | a | aaaa | cname"],
                ["target",    "string", true,  "목적지 (타입에 따라 다름, 아래 참조)"],
                ["altcha",    "string", false, "Altcha PoW 토큰 (/api/v1/altcha 에서 취득)"],
              ]} />
              <Block label="타입별 target 형식" code={`// redirect — 외부 URL로 302 리다이렉트 (CNAME → krl.kr)
{ "type": "redirect", "target": "https://danwoo.dev" }

// github — GitHub Pages 연결 (CNAME → username.github.io)
{ "type": "github", "target": "username.github.io" }

// vercel — Vercel 배포 연결 (CNAME → cname.vercel-dns.com)
{ "type": "vercel", "target": "myapp.vercel.app" }

// html — HTML 직접 호스팅 (CNAME → krl.kr, 서버에서 서빙)
{ "type": "html", "target": "<!DOCTYPE html><html>...</html>" }

// api — API 엔드포인트 프록시 (CNAME → krl.kr)
{ "type": "api", "target": "https://api.example.com" }

// a — IPv4 A 레코드 직접 설정
{ "type": "a", "target": "1.2.3.4" }

// aaaa — IPv6 AAAA 레코드 직접 설정
{ "type": "aaaa", "target": "2001:db8::1" }

// cname — 커스텀 CNAME 레코드 직접 설정
{ "type": "cname", "target": "example.com" }`} />
              <LangBlock examples={{
                curl: `# A 레코드 등록 (IPv4 직접 연결)
curl -X POST https://krl.kr/api/v1/subdomains \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: krl_xxxx" \\
  -d '{
    "subdomain": "myserver",
    "type": "a",
    "target": "1.2.3.4"
  }'

# 리다이렉트 등록
curl -X POST https://krl.kr/api/v1/subdomains \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: krl_xxxx" \\
  -d '{
    "subdomain": "blog",
    "type": "redirect",
    "target": "https://danwoo.dev"
  }'`,
                js: `// A 레코드 등록
await fetch("https://krl.kr/api/v1/subdomains", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-API-Key": "krl_xxxx" },
  body: JSON.stringify({
    subdomain: "myserver",
    type: "a",
    target: "1.2.3.4",
  }),
});

// 커스텀 CNAME 등록
await fetch("https://krl.kr/api/v1/subdomains", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-API-Key": "krl_xxxx" },
  body: JSON.stringify({
    subdomain: "danwoo",
    type: "cname",
    target: "example.com",
  }),
});`,
                python: `# A 레코드 등록
client.post(
    "https://krl.kr/api/v1/subdomains",
    json={
        "subdomain": "myserver",
        "type": "a",
        "target": "1.2.3.4",
    },
)

# AAAA 레코드 등록
client.post(
    "https://krl.kr/api/v1/subdomains",
    json={
        "subdomain": "myserver6",
        "type": "aaaa",
        "target": "2001:db8::1",
    },
)`,
              }} />
              <Block label="응답 예시" code={`{
  "id": "sub_xxxxxxxxxxxx",
  "subdomain": "myserver",
  "full_domain": "myserver.krl.kr",
  "type": "a",
  "target": "1.2.3.4",
  "is_active": true,
  "cf_configured": true,
  "cname_target": "1.2.3.4",
  "created_at": 1748000000000,
  "note": "DNS 레코드가 생성되었습니다. 전파까지 최대 5분이 소요될 수 있습니다."
}`} />
            </Endpoint>

            <Endpoint method="PATCH" path="/api/v1/subdomains/:id" desc="서브도메인 타입·목적지·활성 상태 변경. 타입 또는 target 변경 시 Cloudflare DNS가 자동 업데이트됩니다." auth>
              <ParamTable rows={[
                ["type",      "string",  false, "새 타입 (redirect | github | vercel | html | api | a | aaaa | cname)"],
                ["target",    "string",  false, "새 목적지 (타입에 맞는 값)"],
                ["is_active", "boolean", false, "활성 상태 (true / false)"],
              ]} />
            </Endpoint>
            <Endpoint method="DELETE" path="/api/v1/subdomains/:id" desc="서브도메인 삭제. Cloudflare DNS 레코드도 자동 제거됩니다." auth />
            <Endpoint method="POST" path="/api/v1/subdomains/:id/sync-dns" desc="Cloudflare DNS 레코드를 강제 재동기화합니다. DNS가 불일치할 때 사용하세요." auth />
          </Section>

          {/* ── 커뮤니티 ── */}
          <Section id="community" title="커뮤니티" badge="Community">
            <Endpoint method="GET" path="/api/v1/community" desc="게시글 목록 조회. 게시판·페이지·검색어 지원.">
              <ParamTable rows={[
                ["board", "string", false, "notice | free | feature (기본: free)"],
                ["page",  "number", false, "페이지 번호"],
                ["limit", "number", false, "페이지당 개수 (최대 50)"],
              ]} />
              <Block label="응답" code={`{
  "posts": [
    {
      "id": "post_xxxxxxxxxxxx",
      "board": "free",
      "title": "게시글 제목",
      "content_preview": "내용 미리보기 (200자)...",
      "view_count": 42,
      "like_count": 7,
      "comment_count": 3,
      "is_pinned": false,
      "liked": false,
      "created_at": 1735689600000,
      "author": { "id": "usr_xxx", "name": "홍길동" }
    }
  ],
  "total": 100,
  "page": 1,
  "pages": 5
}`} />
            </Endpoint>

            <Endpoint method="POST" path="/api/v1/community" desc="새 게시글 작성" auth>
              <ParamTable rows={[
                ["board",   "string", true,  "게시판 (notice | free | feature)"],
                ["title",   "string", true,  "제목 (최대 200자)"],
                ["content", "string", true,  "내용 (최대 10,000자)"],
              ]} />
            </Endpoint>

            <Endpoint method="GET"    path="/api/v1/community/:id"          desc="특정 게시글 상세 조회 (조회수 자동 증가)" />
            <Endpoint method="PATCH"  path="/api/v1/community/:id"          desc="게시글 수정 (작성자 또는 관리자)" auth />
            <Endpoint method="DELETE" path="/api/v1/community/:id"          desc="게시글 삭제 (작성자 또는 관리자)" auth />
            <Endpoint method="POST"   path="/api/v1/community/:id/like"     desc="좋아요 토글 (이미 좋아요 시 취소)" auth />
            <Endpoint method="GET"    path="/api/v1/community/:id/comments" desc="댓글 목록 (오래된 순)" />
            <Endpoint method="POST"   path="/api/v1/community/:id/comments" desc="댓글 작성" auth>
              <ParamTable rows={[
                ["content", "string", true, "댓글 내용 (최대 2,000자)"],
              ]} />
            </Endpoint>
            <Endpoint method="DELETE" path="/api/v1/community/:id/comments" desc="댓글 삭제 (?comment_id=xxx). 작성자 또는 게시글 작성자 가능." auth />
          </Section>

          {/* ── API 키 관리 ── */}
          <Section id="keys" title="API 키 관리">
            <Endpoint method="GET"    path="/api/v1/keys" desc="발급된 API 키 목록 (키 해시 앞 12자만 노출)" auth />
            <Endpoint method="POST"   path="/api/v1/keys" desc="새 API 키 발급. 발급 시점에만 전체 키 확인 가능." auth>
              <ParamTable rows={[
                ["name",       "string", true,  "키 이름 (최대 80자)"],
                ["scopes",     "array",  false, "권한 범위 (기본: 전체). links:read, links:write, analytics:read"],
                ["expires_at", "string", false, "만료 일시 (ISO 8601). 미설정 시 영구"],
              ]} />
              <Block label="응답 (최초 1회만 전체 키 제공)" code={`{
  "id": "key_xxxxxxxxxxxx",
  "name": "CI/CD 키",
  "key": "krl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",  // ← 이후 조회 불가
  "key_prefix": "krl_xxxxxxxx",
  "scopes": ["links:read", "links:write"],
  "created_at": "2026-01-01T00:00:00.000Z",
  "expires_at": null
}`} />
            </Endpoint>
            <Endpoint method="DELETE" path="/api/v1/keys/:id" desc="API 키 즉시 폐기. 해당 키로의 모든 요청이 차단됩니다." auth />
          </Section>

          {/* ── 검색 ── */}
          <Section id="search" title="검색">
            <Alert type="tip">인증 없이 사용할 수 있습니다. 로컬 SearXNG 인스턴스로 구동되며 백업 인스턴스를 사용합니다.</Alert>
            <Endpoint method="GET" path="/api/v1/search" desc="웹 검색 결과를 JSON으로 반환합니다.">
              <ParamTable rows={[
                ["q",        "string",  true,  "검색어"],
                ["category", "string",  false, "검색 카테고리. general(기본), web, images, news, videos, science, map"],
                ["page",     "integer", false, "페이지 번호 (기본: 1)"],
              ]} />
              <LangBlock examples={{
                curl: `curl "https://krl.kr/api/v1/search?q=apple&category=general&page=1"`,
                js: `const res = await fetch(
  "https://krl.kr/api/v1/search?q=apple&category=general&page=1"
);
const data = await res.json();
console.log(data.results.length, "개 결과");`,
                python: `import httpx

res = httpx.get("https://krl.kr/api/v1/search", params={
    "q": "apple",
    "category": "general",
    "page": 1,
})
data = res.json()
print(len(data["results"]), "개 결과")`,
              }} />
              <Block label="응답" code={`{
  "query": "apple",
  "number_of_results": 0,
  "results": [
    {
      "url": "https://www.apple.com",
      "title": "Apple",
      "content": "Apple is a technology company...",
      "engine": "brave",
      "score": 1.0
    }
  ],
  "suggestions": ["apple inc", "apple watch"],
  "answers": [],
  "infoboxes": []
}`} />
            </Endpoint>
          </Section>

          {/* ── AI 채팅 ── */}
          <Section id="ai" title="AI 채팅">
            <Alert type="tip">인증 없이 사용할 수 있습니다. AI가 생성한 내용은 부정확할 수 있으니 중요한 정보는 직접 확인하세요.</Alert>

            <Endpoint method="POST" path="/api/v1/ai/chat" desc="AI와 대화합니다. 멀티턴 대화를 지원합니다.">
              <ParamTable rows={[
                ["messages", "array",   true,  "대화 메시지 배열. 각 항목은 { role, content }"],
                ["stream",   "boolean", false, "스트리밍 응답 사용 여부 (기본: false)"],
              ]} />
              <LangBlock examples={{
                curl: `curl -X POST https://krl.kr/api/v1/ai/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      { "role": "user", "content": "URL 단축 서비스란 무엇인가요?" }
    ]
  }'`,
                js: `const res = await fetch("https://krl.kr/api/v1/ai/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [
      { role: "user", content: "URL 단축 서비스란 무엇인가요?" }
    ]
  })
});
const data = await res.json();
console.log(data.content);`,
                python: `import httpx

res = httpx.post("https://krl.kr/api/v1/ai/chat", json={
    "messages": [
        {"role": "user", "content": "URL 단축 서비스란 무엇인가요?"}
    ]
})
print(res.json()["content"])`,
              }} />
              <Block label="응답" code={`{
  "content": "URL 단축 서비스는 긴 URL을 짧은 주소로 변환해 주는 서비스입니다..."
}`} />
            </Endpoint>

            <Endpoint method="POST" path="/api/v1/ai/search-summary" desc="검색 결과를 기반으로 AI 요약을 생성합니다. 검색 페이지의 'AI 요약' 기능에 사용됩니다.">
              <ParamTable rows={[
                ["query",    "string", true,  "검색어"],
                ["snippets", "array",  false, "검색 결과 스니펫 배열. 각 항목은 { title, content, url }"],
              ]} />
              <LangBlock examples={{
                curl: `curl -X POST https://krl.kr/api/v1/ai/search-summary \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "애플 최신 제품",
    "snippets": [
      { "title": "Apple", "content": "Apple announced...", "url": "https://apple.com" }
    ]
  }'`,
                js: `const res = await fetch("https://krl.kr/api/v1/ai/search-summary", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "애플 최신 제품",
    snippets: results.slice(0, 5).map(r => ({
      title: r.title,
      content: r.content,
      url: r.url
    }))
  })
});
const { summary } = await res.json();`,
              }} />
              <Block label="응답" code={`{
  "summary": "애플은 최근 iPhone 16 시리즈와 M4 칩셋을 탑재한 Mac을 출시했습니다..."
}`} />
            </Endpoint>
          </Section>

          {/* ── 오류 코드 ── */}
          <Section id="errors" title="오류 코드">
            <p style={{ color: "var(--color-body)", lineHeight: 1.7, marginBottom: "16px" }}>
              모든 오류 응답은 아래 형식으로 반환됩니다.
            </p>
            <Block code={`{
  "error": "오류 설명 메시지",
  "code": "ERROR_CODE"    // 기계 판독 가능한 오류 코드
}`} />

            <div style={{ border: "1px solid var(--color-hairline)", borderRadius: "10px", overflow: "hidden", marginBottom: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "70px 180px 1fr", padding: "9px 16px", background: "var(--color-surface-card)", borderBottom: "1px solid var(--color-hairline)", fontSize: "0.7rem", fontWeight: 700, color: "var(--color-muted)", letterSpacing: ".04em", textTransform: "uppercase" }}>
                <span>상태</span><span>코드</span><span>설명</span>
              </div>
              {[
                ["400", "VALIDATION_ERROR",     "요청 형식 또는 파라미터 오류"],
                ["400", "ALTCHA_FAILED",         "보안 인증(PoW) 실패"],
                ["400", "INVALID_URL",           "유효하지 않은 URL 형식"],
                ["400", "INVALID_SLUG",          "사용 불가 슬러그 (예약어, 특수문자 등)"],
                ["401", "UNAUTHORIZED",          "API 키 없음 또는 만료"],
                ["403", "FORBIDDEN",             "해당 리소스에 대한 권한 없음"],
                ["404", "NOT_FOUND",             "요청한 리소스를 찾을 수 없음"],
                ["409", "EMAIL_TAKEN",           "이미 사용 중인 이메일 주소"],
                ["409", "SLUG_TAKEN",            "이미 사용 중인 슬러그"],
                ["410", "EXPIRED",               "만료된 링크·파일·페이스트"],
                ["413", "FILE_TOO_LARGE",        "파일 크기 한도 초과"],
                ["429", "RATE_LIMITED",          "요청 한도 초과. Retry-After 헤더 확인"],
                ["503", "DB_UNAVAILABLE",        "데이터베이스 연결 오류"],
                ["500", "INTERNAL_ERROR",        "서버 내부 오류"],
              ].map(([status, code, desc], i, arr) => (
                <div key={code} style={{ display: "grid", gridTemplateColumns: "70px 180px 1fr", padding: "10px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--color-hairline)" : "none", fontSize: "0.875rem", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.8rem", color: parseInt(status) >= 500 ? "#FF5F57" : parseInt(status) >= 400 ? "#F37338" : "#30d158" }}>
                    {status}
                  </span>
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-ink)", background: "var(--color-surface-card)", padding: "1px 6px", borderRadius: "4px" }}>{code}</code>
                  <span style={{ color: "var(--color-muted)" }}>{desc}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: "20px 24px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "10px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <div>
                <p style={{ fontWeight: 600, marginBottom: "4px" }}>문의 및 지원</p>
                <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", lineHeight: 1.6 }}>
                  API 문제·버그·개선 제안은{" "}
                  <a href="mailto:contact@rukkit.net" style={{ color: "var(--color-ink)", textDecoration: "underline" }}>contact@rukkit.net</a>
                  {" "}또는{" "}
                  <Link href="/community?board=feature" style={{ color: "var(--color-ink)", textDecoration: "underline" }}>커뮤니티 기능 제안</Link>에 남겨주세요.
                </p>
              </div>
            </div>
          </Section>
        </main>
      </div>

      <style>{`
        @media (max-width: 800px) {
          aside { display: none !important; }
          div[style*="grid-template-columns: 216px"] { grid-template-columns: 1fr !important; gap: 0 !important; }
        }
        pre::-webkit-scrollbar { height: 4px; }
        pre::-webkit-scrollbar-track { background: transparent; }
        pre::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 4px; }
      `}</style>
    </div>
  );
}
