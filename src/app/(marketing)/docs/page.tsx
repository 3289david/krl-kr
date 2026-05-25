import Link from "next/link";

interface CodeBlockProps {
  code: string;
  label?: string;
}

function CodeBlock({ code, label }: CodeBlockProps) {
  return (
    <div style={{ background: "var(--color-surface-dark)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: "16px" }}>
      {label && (
        <div style={{ padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", fontSize: "0.75rem", color: "rgba(243,240,238,0.4)", fontFamily: "var(--font-mono)" }}>
          {label}
        </div>
      )}
      <pre style={{ padding: "20px", margin: 0, fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--color-canvas)", overflowX: "auto", lineHeight: 1.6 }}>
        {code}
      </pre>
    </div>
  );
}

const sections = [
  {
    id: "auth",
    title: "인증",
    content: "API 키를 이용하거나 JWT 세션 쿠키로 인증합니다.",
    examples: [
      {
        label: "API 키 인증",
        code: `curl -X GET "https://krl.kr/api/v1/links" \\
  -H "X-API-Key: krl_your_api_key_here"`,
      },
      {
        label: "Bearer 토큰 인증",
        code: `curl -X GET "https://krl.kr/api/v1/links" \\
  -H "Authorization: Bearer your_jwt_token"`,
      },
    ],
  },
  {
    id: "shorten",
    title: "URL 단축",
    content: "POST /api/v1/shorten — 인증 없이도 사용 가능 (비율 제한 적용)",
    examples: [
      {
        label: "기본 URL 단축",
        code: `curl -X POST "https://krl.kr/api/v1/shorten" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/very-long-url",
    "slug": "my-link",
    "title": "내 링크"
  }'`,
      },
      {
        label: "응답 예시",
        code: `{
  "id": "lnk_xxxxxxxxxxxx",
  "slug": "my-link",
  "short_url": "https://krl.kr/my-link",
  "original_url": "https://example.com/very-long-url",
  "created_at": "2025-01-01T00:00:00.000Z",
  "expires_at": null,
  "has_password": false,
  "qr_url": "https://krl.kr/api/qr/my-link"
}`,
      },
    ],
  },
  {
    id: "links",
    title: "링크 관리",
    content: "GET /api/v1/links — 목록 조회. GET/PATCH/DELETE /api/v1/links/:id",
    examples: [
      {
        label: "링크 목록 조회",
        code: `curl -X GET "https://krl.kr/api/v1/links?page=1&limit=20" \\
  -H "X-API-Key: krl_your_api_key_here"`,
      },
      {
        label: "링크 수정",
        code: `curl -X PATCH "https://krl.kr/api/v1/links/lnk_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: krl_your_api_key_here" \\
  -d '{
    "title": "새 제목",
    "expires_at": "2025-12-31T23:59:59Z"
  }'`,
      },
      {
        label: "링크 삭제",
        code: `curl -X DELETE "https://krl.kr/api/v1/links/lnk_xxxxxxxxxxxx" \\
  -H "X-API-Key: krl_your_api_key_here"`,
      },
    ],
  },
  {
    id: "analytics",
    title: "분석",
    content: "GET /api/v1/links/:id/stats — 클릭 분석 조회",
    examples: [
      {
        label: "링크 분석 조회 (30일)",
        code: `curl -X GET "https://krl.kr/api/v1/links/lnk_xxxx/stats?days=30" \\
  -H "X-API-Key: krl_your_api_key_here"`,
      },
      {
        label: "응답 예시",
        code: `{
  "total": 1234,
  "unique": 987,
  "byDay": [
    { "date": "2025-01-01", "count": 45 },
    { "date": "2025-01-02", "count": 67 }
  ],
  "byCountry": [
    { "country": "KR", "count": 800 },
    { "country": "US", "count": 200 }
  ],
  "byDevice": [
    { "device_type": "mobile", "count": 700 },
    { "device_type": "desktop", "count": 534 }
  ],
  "byBrowser": [
    { "browser": "Chrome", "count": 600 }
  ],
  "byReferer": [
    { "referer_domain": "instagram.com", "count": 400 }
  ]
}`,
      },
    ],
  },
  {
    id: "qr",
    title: "QR 코드",
    content: "POST /api/v1/qr — QR 코드 생성",
    examples: [
      {
        label: "QR 코드 생성",
        code: `curl -X POST "https://krl.kr/api/v1/qr" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://krl.kr/my-link",
    "style": {
      "size": 300,
      "color": "#141413",
      "bgColor": "#FCFBFA",
      "errorCorrection": "M"
    }
  }'`,
      },
    ],
  },
  {
    id: "paste",
    title: "Pastebin",
    content: "POST /api/v1/paste — 페이스트 생성. GET /api/v1/paste/:slug — 조회",
    examples: [
      {
        label: "페이스트 생성",
        code: `curl -X POST "https://krl.kr/api/v1/paste" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "console.log(\\"Hello, World!\\");",
    "title": "테스트 코드",
    "language": "javascript",
    "is_public": true
  }'`,
      },
    ],
  },
  {
    id: "files",
    title: "파일 공유",
    content: "POST /api/v1/files — 파일 업로드 (multipart/form-data)",
    examples: [
      {
        label: "파일 업로드",
        code: `curl -X POST "https://krl.kr/api/v1/files" \\
  -H "X-API-Key: krl_your_api_key_here" \\
  -F "file=@/path/to/file.pdf"`,
      },
    ],
  },
  {
    id: "webhook",
    title: "웹훅",
    content: "POST /api/v1/webhook — 엔드포인트 생성. GET /api/v1/webhook/:slug?inspect=1 — 요청 조회",
    examples: [
      {
        label: "웹훅 엔드포인트 생성",
        code: `curl -X POST "https://krl.kr/api/v1/webhook" \\
  -H "Content-Type: application/json" \\
  -d '{
    "label": "테스트 웹훅"
  }'`,
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <main>
      <section className="section" style={{ paddingBottom: "48px" }}>
        <div className="container">
          <div style={{ maxWidth: "640px" }}>
            <p className="eyebrow" style={{ marginBottom: "24px" }}>API 문서</p>
            <h1 style={{ marginBottom: "20px" }}>개발자 문서</h1>
            <p style={{ fontSize: "1.125rem", color: "var(--color-muted)", marginBottom: "32px" }}>
              REST API로 KRL.KR의 모든 기능을 자동화하세요.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Link href="/dashboard/api-keys" className="btn btn-primary btn-pill" style={{ textDecoration: "none" }}>
                API 키 발급받기
              </Link>
              <a href="#auth" className="btn btn-secondary btn-pill" style={{ textDecoration: "none" }}>
                인증 가이드
              </a>
            </div>
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: "96px" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "48px", alignItems: "start" }}>
            {/* TOC */}
            <div style={{ position: "sticky", top: "24px" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: "16px" }}>목차</p>
              <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {sections.map((s) => (
                  <a key={s.id} href={`#${s.id}`} style={{ fontSize: "0.9rem", color: "var(--color-body)", textDecoration: "none", padding: "6px 0" }}>
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div style={{ display: "flex", flexDirection: "column", gap: "64px" }}>
              {/* Base URL */}
              <div>
                <h3 style={{ marginBottom: "16px" }}>Base URL</h3>
                <CodeBlock code="https://krl.kr/api/v1" label="Base URL" />
                <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
                  모든 API 응답은 JSON 형식입니다. 오류 응답에는 <code>error</code> 필드와 <code>code</code> 필드가 포함됩니다.
                </p>
              </div>

              {sections.map((section) => (
                <div key={section.id} id={section.id}>
                  <h2 style={{ marginBottom: "12px" }}>{section.title}</h2>
                  <p style={{ color: "var(--color-muted)", marginBottom: "20px" }}>{section.content}</p>
                  {section.examples.map((example) => (
                    <CodeBlock key={example.label} code={example.code} label={example.label} />
                  ))}
                </div>
              ))}

              {/* Rate limits */}
              <div>
                <h2 style={{ marginBottom: "12px" }}>비율 제한 (Rate Limiting)</h2>
                <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--color-hairline-strong)" }}>
                        <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-muted)" }}>플랜</th>
                        <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-muted)" }}>제한</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { plan: "익명 (비인증)", limit: "10 req/분" },
                        { plan: "무료", limit: "100 req/일" },
                        { plan: "프로", limit: "10,000 req/일" },
                        { plan: "비즈니스", limit: "무제한" },
                      ].map((r, i) => (
                        <tr key={r.plan} style={{ borderBottom: i < 3 ? "1px solid var(--color-hairline)" : "none" }}>
                          <td style={{ padding: "14px 20px", fontSize: "0.9375rem" }}>{r.plan}</td>
                          <td style={{ padding: "14px 20px", fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--color-muted)" }}>{r.limit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
