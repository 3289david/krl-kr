import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API 문서 | KRL.KR",
  description: "KRL.KR REST API 문서 — URL 단축, QR 코드, 분석, 파일 공유 등을 API로 자동화하세요.",
};

function Code({ children }: { children: string }) {
  return (
    <code style={{
      fontFamily: "var(--font-mono)", fontSize: "0.85em",
      background: "var(--color-surface-card)", padding: "2px 6px",
      borderRadius: "4px", color: "var(--color-ink)",
    }}>
      {children}
    </code>
  );
}

function Block({ label, code }: { label?: string; code: string }) {
  return (
    <div style={{ background: "var(--color-surface-dark)", borderRadius: "var(--radius-lg)", overflow: "hidden", margin: "16px 0" }}>
      {label && (
        <div style={{ padding: "8px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", fontSize: "0.75rem", color: "rgba(243,240,238,0.4)", fontFamily: "var(--font-mono)" }}>
          {label}
        </div>
      )}
      <pre style={{ padding: "18px 20px", margin: 0, fontFamily: "var(--font-mono)", fontSize: "0.8125rem",
        color: "var(--color-canvas)", overflowX: "auto", lineHeight: 1.65 }}>
        {code}
      </pre>
    </div>
  );
}

function Method({ m }: { m: string }) {
  const color = m === "GET" ? "#30d158" : m === "POST" ? "#F37338" : m === "PATCH" ? "#FFBD2E" : "#FF5F57";
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.8125rem", color, background: color + "1A", padding: "2px 8px", borderRadius: "4px", marginRight: "10px" }}>
      {m}
    </span>
  );
}

function Endpoint({ method, path, desc, auth }: { method: string; path: string; desc: string; auth?: boolean }) {
  return (
    <div style={{ border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-md)", padding: "16px 20px", marginBottom: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
        <Method m={method} />
        <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", color: "var(--color-ink)", flex: 1 }}>{path}</code>
        {auth && <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", background: "var(--color-surface-card)", padding: "2px 8px", borderRadius: "var(--radius-pill)" }}>🔑 인증 필요</span>}
      </div>
      <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", margin: 0 }}>{desc}</p>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: "64px", scrollMarginTop: "80px" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid var(--color-hairline)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

const TOC = [
  { id: "intro", label: "시작하기" },
  { id: "auth", label: "인증" },
  { id: "shorten", label: "URL 단축" },
  { id: "links", label: "링크 관리" },
  { id: "analytics", label: "분석" },
  { id: "qr", label: "QR 코드" },
  { id: "paste", label: "Pastebin" },
  { id: "files", label: "파일 공유" },
  { id: "email", label: "이메일 별칭" },
  { id: "subdomains", label: "서브도메인" },
  { id: "errors", label: "오류 코드" },
];

export default function DocsPage() {
  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "80px 24px 120px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "60px", alignItems: "start" }}>

        {/* ── 사이드바 목차 ─── */}
        <aside style={{ position: "sticky", top: "90px" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
            color: "var(--color-muted)", marginBottom: "16px" }}>
            목차
          </p>
          <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {TOC.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="docs-toc-link">
                {item.label}
              </a>
            ))}
          </nav>

          <div style={{ marginTop: "32px", padding: "16px", background: "var(--color-lifted)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-hairline)" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginBottom: "10px" }}>API 키 발급</p>
            <Link href="/dashboard/api-keys" className="btn btn-primary btn-sm btn-pill" style={{ textDecoration: "none", width: "100%", justifyContent: "center" }}>
              대시보드 →
            </Link>
          </div>
        </aside>

        {/* ── 본문 ─── */}
        <main>
          <div style={{ marginBottom: "56px" }}>
            <p className="eyebrow" style={{ marginBottom: "16px" }}>개발자 문서</p>
            <h1 style={{ fontSize: "2.5rem", fontWeight: 500, letterSpacing: "-0.03em", marginBottom: "16px" }}>
              KRL.KR API
            </h1>
            <p style={{ fontSize: "1.0625rem", color: "var(--color-muted)", lineHeight: 1.7, maxWidth: "560px" }}>
              KRL.KR의 모든 기능을 API로 사용할 수 있습니다. 자동화 스크립트, 봇, 앱에서
              URL 단축, QR 생성, 파일 공유 등을 직접 연동해보세요.
            </p>
            <div style={{ marginTop: "20px", padding: "14px 18px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>
              Base URL: <strong>https://krl.kr/api/v1</strong>
            </div>
          </div>

          {/* ── 시작하기 ─── */}
          <Section id="intro" title="시작하기">
            <p style={{ color: "var(--color-body)", lineHeight: 1.7, marginBottom: "16px" }}>
              회원가입 없이도 URL 단축 API를 사용할 수 있습니다. 분석, 링크 관리 등 더 많은 기능은 API 키가 필요합니다.
              <Link href="/dashboard/api-keys" style={{ color: "var(--color-ink)", marginLeft: "4px" }}>대시보드에서 API 키를 발급</Link>하세요.
            </p>
            <Block label="빠른 시작 — curl" code={`# URL 단축 (인증 없이)
curl -X POST "https://krl.kr/api/v1/shorten" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/long-path"}'

# 응답
{
  "short_url": "https://krl.kr/abc123",
  "slug": "abc123",
  "qr_url": "https://krl.kr/api/qr/abc123"
}`} />
          </Section>

          {/* ── 인증 ─── */}
          <Section id="auth" title="인증">
            <p style={{ color: "var(--color-body)", lineHeight: 1.7, marginBottom: "20px" }}>
              API 키는 <Code>X-API-Key</Code> 헤더로 전달하거나 <Code>Authorization: Bearer</Code> 헤더로 JWT 토큰을 사용할 수 있습니다.
            </p>
            <Block label="API 키 인증" code={`curl https://krl.kr/api/v1/links \\
  -H "X-API-Key: krl_xxxxxxxxxxxxxxxxxxxx"`} />
            <Block label="JWT Bearer 인증" code={`curl https://krl.kr/api/v1/links \\
  -H "Authorization: Bearer eyJhbGci..."`} />
            <div style={{ padding: "14px 18px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "#92400E" }}>
              API 키는 노출되지 않도록 서버 환경 변수에 저장하세요. 클라이언트 코드에 직접 넣지 마세요.
            </div>
          </Section>

          {/* ── URL 단축 ─── */}
          <Section id="shorten" title="URL 단축">
            <Endpoint method="POST" path="/api/v1/shorten" desc="긴 URL을 단축합니다. 인증 없이도 사용 가능합니다." />
            <Block label="요청 본문" code={`{
  "url": "https://example.com/path",       // 필수
  "slug": "my-link",                        // 선택 — 커스텀 슬러그 (로그인 필요)
  "title": "링크 제목",                     // 선택
  "password": "secret",                    // 선택 — 비밀번호 보호
  "expires_at": "2025-12-31T23:59:59Z",   // 선택 — 만료 날짜 (ISO 8601)
  "max_clicks": 100,                       // 선택 — 최대 클릭 수
  "is_dynamic": true,                      // 선택 — 다이나믹 링크 (목적지 나중에 변경 가능)
  "ios_url": "myapp://open",              // 선택 — iOS 앱 딥링크
  "android_url": "myapp://open",          // 선택 — Android 앱 딥링크
  "utm_source": "newsletter",             // 선택 — UTM 파라미터 자동 추가
  "utm_medium": "email",
  "utm_campaign": "launch2025"
}`} />
            <Block label="응답" code={`{
  "id": "lnk_xxxxxxxxxxxx",
  "slug": "my-link",
  "short_url": "https://krl.kr/my-link",
  "original_url": "https://example.com/path",
  "created_at": "2025-01-01T00:00:00.000Z",
  "expires_at": null,
  "has_password": false,
  "qr_url": "https://krl.kr/api/qr/my-link"
}`} />
          </Section>

          {/* ── 링크 관리 ─── */}
          <Section id="links" title="링크 관리">
            <Endpoint method="GET" path="/api/v1/links" desc="내 링크 목록을 가져옵니다. ?page=1&limit=20&q=검색어" auth />
            <Endpoint method="GET" path="/api/v1/links/:id" desc="특정 링크의 상세 정보를 가져옵니다." auth />
            <Endpoint method="PATCH" path="/api/v1/links/:id" desc="링크의 URL, 제목, 만료일 등을 수정합니다." auth />
            <Endpoint method="DELETE" path="/api/v1/links/:id" desc="링크를 삭제합니다." auth />
            <Block label="링크 수정 예시" code={`curl -X PATCH "https://krl.kr/api/v1/links/lnk_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: krl_xxxx" \\
  -d '{
    "url": "https://new-destination.com",
    "title": "새 제목",
    "expires_at": "2026-01-01T00:00:00Z",
    "is_active": true
  }'`} />
            <Block label="목록 조회 응답" code={`{
  "links": [ { "id": "...", "slug": "...", "original_url": "...", "click_count": 42 }, ... ],
  "total": 100,
  "page": 1,
  "pages": 5,
  "limit": 20
}`} />
          </Section>

          {/* ── 분석 ─── */}
          <Section id="analytics" title="분석">
            <Endpoint method="GET" path="/api/v1/links/:id/stats" desc="링크별 클릭 통계 — 국가, 기기, 브라우저, 날짜별 집계" auth />
            <Block label="응답 예시" code={`{
  "total_clicks": 1024,
  "unique_clicks": 856,
  "by_country": [{ "country": "KR", "clicks": 800 }, ...],
  "by_device": [{ "device": "mobile", "clicks": 600 }, ...],
  "by_browser": [{ "browser": "Chrome", "clicks": 512 }, ...],
  "by_date": [{ "date": "2025-01-01", "clicks": 42 }, ...]
}`} />
          </Section>

          {/* ── QR 코드 ─── */}
          <Section id="qr" title="QR 코드">
            <Endpoint method="GET" path="/api/qr/:slug" desc="슬러그의 QR 코드를 SVG 또는 PNG로 반환합니다." />
            <Endpoint method="GET" path="/api/v1/qr" desc="내 QR 코드 목록" auth />
            <Endpoint method="POST" path="/api/v1/qr" desc="QR 코드 생성 (커스텀 스타일)" auth />
            <Block label="QR 코드 이미지 직접 사용" code={`<!-- HTML에서 바로 사용 -->
<img src="https://krl.kr/api/qr/my-link" alt="QR Code" />

<!-- SVG 형식 -->
https://krl.kr/api/qr/my-link?format=svg

<!-- PNG 형식, 크기 지정 -->
https://krl.kr/api/qr/my-link?format=png&size=300`} />
            <Block label="커스텀 QR 생성" code={`curl -X POST "https://krl.kr/api/v1/qr" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: krl_xxxx" \\
  -d '{
    "url": "https://krl.kr/my-link",
    "title": "이벤트 QR",
    "fg_color": "#141413",
    "bg_color": "#FFFFFF",
    "include_logo": true
  }'`} />
          </Section>

          {/* ── Pastebin ─── */}
          <Section id="paste" title="Pastebin">
            <Endpoint method="POST" path="/api/v1/paste" desc="텍스트 또는 코드를 공유 링크로 만듭니다." />
            <Endpoint method="GET" path="/api/v1/paste/:slug" desc="페이스트 내용을 가져옵니다." />
            <Endpoint method="DELETE" path="/api/v1/paste/:slug" desc="페이스트를 삭제합니다." auth />
            <Block label="페이스트 생성" code={`curl -X POST "https://krl.kr/api/v1/paste" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "에러 로그",
    "content": "Error: something went wrong\\n  at ...",
    "language": "text",
    "expires_in": 86400,
    "password": "secret123"
  }'

# 응답
{ "slug": "abc123", "url": "https://krl.kr/p/abc123" }`} />
          </Section>

          {/* ── 파일 공유 ─── */}
          <Section id="files" title="파일 공유">
            <Endpoint method="POST" path="/api/v1/files" desc="파일을 업로드하고 단축 링크를 받습니다." auth />
            <Endpoint method="GET" path="/api/v1/files" desc="업로드한 파일 목록" auth />
            <Endpoint method="DELETE" path="/api/v1/files/:slug" desc="파일 삭제" auth />
            <Block label="파일 업로드" code={`curl -X POST "https://krl.kr/api/v1/files" \\
  -H "X-API-Key: krl_xxxx" \\
  -F "file=@report.pdf" \\
  -F "expires_in=604800"

# 응답
{
  "slug": "abc123",
  "url": "https://krl.kr/f/abc123",
  "filename": "report.pdf",
  "size": 204800,
  "expires_at": "2025-01-08T00:00:00.000Z"
}`} />
          </Section>

          {/* ── 이메일 별칭 ─── */}
          <Section id="email" title="이메일 별칭">
            <Endpoint method="GET" path="/api/v1/email" desc="내 이메일 별칭 목록" auth />
            <Endpoint method="POST" path="/api/v1/email" desc="새 이메일 별칭 생성 — 이름@krl.kr" auth />
            <Endpoint method="DELETE" path="/api/v1/email?id=xxx" desc="이메일 별칭 삭제" auth />
            <Endpoint method="GET" path="/api/v1/email/inbox" desc="수신된 이메일 목록 (?alias=이름&page=1)" auth />
            <Block label="별칭 생성" code={`curl -X POST "https://krl.kr/api/v1/email" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: krl_xxxx" \\
  -d '{"alias": "danwoo"}'

# 응답: danwoo@krl.kr 주소가 생성됩니다.
{
  "alias": "danwoo",
  "email": "danwoo@krl.kr",
  "is_active": true
}`} />
          </Section>

          {/* ── 서브도메인 ─── */}
          <Section id="subdomains" title="서브도메인">
            <Endpoint method="GET" path="/api/v1/subdomains" desc="내 서브도메인 목록" auth />
            <Endpoint method="POST" path="/api/v1/subdomains" desc="서브도메인 생성 — 이름.krl.kr" auth />
            <Endpoint method="PATCH" path="/api/v1/subdomains/:id" desc="서브도메인 설정 변경" auth />
            <Endpoint method="DELETE" path="/api/v1/subdomains/:id" desc="서브도메인 삭제" auth />
            <Block label="서브도메인 생성" code={`curl -X POST "https://krl.kr/api/v1/subdomains" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: krl_xxxx" \\
  -d '{
    "subdomain": "danwoo",
    "type": "redirect",
    "target": "https://danwoo.dev"
  }'

# type: "redirect" | "github" | "vercel" | "html"
# github: target = "username/repo"
# vercel:  target = "project.vercel.app"`} />
          </Section>

          {/* ── 오류 코드 ─── */}
          <Section id="errors" title="오류 코드">
            <p style={{ color: "var(--color-body)", marginBottom: "20px", lineHeight: 1.7 }}>
              모든 오류 응답은 <Code>{`{ "error": "설명", "code": "ERROR_CODE" }`}</Code> 형식입니다.
            </p>
            <div style={{ border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              {[
                ["400", "Bad Request", "요청 형식이 잘못되었습니다."],
                ["401", "Unauthorized", "API 키가 없거나 유효하지 않습니다."],
                ["403", "Forbidden", "해당 리소스에 접근 권한이 없습니다."],
                ["404", "Not Found", "요청한 리소스를 찾을 수 없습니다."],
                ["409", "Conflict", "이미 사용 중인 슬러그 또는 별칭입니다."],
                ["429", "Too Many Requests", "요청 한도를 초과했습니다. 잠시 후 다시 시도하세요."],
                ["500", "Internal Server Error", "서버 오류입니다. 반복되면 문의해주세요."],
              ].map(([code, name, desc], i) => (
                <div key={code} style={{
                  display: "grid", gridTemplateColumns: "60px 160px 1fr",
                  padding: "12px 18px", fontSize: "0.875rem",
                  borderBottom: i < 6 ? "1px solid var(--color-hairline)" : "none",
                  alignItems: "center", gap: "16px",
                }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: parseInt(code) >= 500 ? "#FF5F57" : parseInt(code) >= 400 ? "#F37338" : "var(--color-ink)" }}>
                    {code}
                  </span>
                  <span style={{ color: "var(--color-ink)", fontWeight: 500 }}>{name}</span>
                  <span style={{ color: "var(--color-muted)" }}>{desc}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "32px", padding: "20px 24px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-md)" }}>
              <p style={{ fontWeight: 600, marginBottom: "8px" }}>문의하기</p>
              <p style={{ fontSize: "0.9rem", color: "var(--color-muted)" }}>
                API 사용 중 문제가 있으면{" "}
                <a href="mailto:contact@rukkit.net" style={{ color: "var(--color-ink)" }}>contact@rukkit.net</a>으로 연락주세요.
              </p>
            </div>
          </Section>
        </main>
      </div>

      <style>{`
        .docs-toc-link {
          font-size: 0.9rem; color: var(--color-body); text-decoration: none;
          padding: 5px 10px; border-radius: var(--radius-sm);
          transition: color 0.1s, background 0.1s; display: block;
        }
        .docs-toc-link:hover { color: var(--color-ink); background: var(--color-surface-card); }
        @media (max-width: 768px) {
          aside { display: none; }
          div[style*="grid-template-columns: 220px"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
