export const metadata = { title: "KRL Blog API Docs", description: "KRL.KR 블로그 공개 API 문서" };

export default function ApiDocsPage() {
  const BASE = "https://krl.kr";

  const endpoints = [
    {
      method: "GET", path: "/api/v1/public/blog/:slug",
      desc: "블로그 정보 조회 (공개 블로그만)",
      params: [],
      example: `${BASE}/api/v1/public/blog/myblog`,
      response: `{
  "blog": {
    "id": 1,
    "slug": "myblog",
    "title": "My Blog",
    "description": "블로그 설명",
    "theme": "default",
    "primary_color": "#2563eb",
    "post_count": 10,
    "url": "https://myblog.krl.kr",
    "rss_url": "https://myblog.krl.kr/rss.xml",
    "created_at": 1700000000000
  }
}`,
    },
    {
      method: "GET", path: "/api/v1/public/blog/:slug/posts",
      desc: "블로그 게시글 목록 조회",
      params: [
        { name: "page", desc: "페이지 번호 (기본: 1)" },
        { name: "limit", desc: "페이지당 개수 (기본: 20, 최대: 50)" },
        { name: "tag", desc: "태그 필터 (선택)" },
      ],
      example: `${BASE}/api/v1/public/blog/myblog/posts?page=1&limit=10&tag=tech`,
      response: `{
  "posts": [
    {
      "id": 42,
      "title": "첫 번째 글",
      "slug": "first-post",
      "excerpt": "글 요약",
      "cover_image": "https://...",
      "tags": ["tech", "dev"],
      "view_count": 128,
      "published_at": 1700000000000,
      "url": "https://myblog.krl.kr/posts/first-post"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 42, "pages": 5 }
}`,
    },
    {
      method: "GET", path: "/api/v1/public/blog/:slug/posts/:postSlug",
      desc: "특정 게시글 전체 내용 조회 (Markdown 포함)",
      params: [],
      example: `${BASE}/api/v1/public/blog/myblog/posts/first-post`,
      response: `{
  "post": {
    "id": 42,
    "title": "첫 번째 글",
    "slug": "first-post",
    "content": "# 제목\\n\\n본문 내용 (Markdown)...",
    "excerpt": "글 요약",
    "cover_image": "https://...",
    "tags": ["tech"],
    "view_count": 128,
    "seo_title": null,
    "seo_description": null,
    "published_at": 1700000000000,
    "url": "https://myblog.krl.kr/posts/first-post"
  }
}`,
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e8f4ff", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#0a1a30", borderBottom: "1px solid #1a3558", padding: "32px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <a href="/" style={{ color: "#6a9fc0", fontSize: "0.875rem", textDecoration: "none" }}>← krl.kr</a>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 8 }}>KRL Blog API</h1>
          <p style={{ color: "#6a9fc0", fontSize: "1rem", lineHeight: 1.6 }}>
            공개 블로그 REST API · 인증 불필요 · 공개 블로그에 한해 접근 가능
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "4px 10px", background: "#1a3558", borderRadius: 6, color: "#6a9fc0", letterSpacing: ".04em" }}>Base URL: https://krl.kr</span>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "4px 10px", background: "#1a3558", borderRadius: 6, color: "#6a9fc0", letterSpacing: ".04em" }}>Content-Type: application/json</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
        {/* Endpoints */}
        {endpoints.map((ep, i) => (
          <div key={i} style={{ marginBottom: 40, background: "#0a1a30", border: "1px solid #1a3558", borderRadius: 14, overflow: "hidden" }}>
            {/* Endpoint header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a3558", display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, padding: "4px 10px", background: "#16a34a", color: "#fff", borderRadius: 6, letterSpacing: ".06em", flexShrink: 0, marginTop: 1 }}>{ep.method}</span>
              <div style={{ flex: 1 }}>
                <code style={{ fontSize: "1rem", fontFamily: "'JetBrains Mono',Consolas,monospace", color: "#e8f4ff" }}>{ep.path}</code>
                <p style={{ fontSize: "0.875rem", color: "#6a9fc0", marginTop: 6 }}>{ep.desc}</p>
              </div>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {ep.params.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#6a9fc0", marginBottom: 10 }}>Query Parameters</p>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                    <thead>
                      <tr>
                        <th style={{ padding: "8px 12px", background: "#0d2040", border: "1px solid #1a3558", textAlign: "left", color: "#e8f4ff", fontWeight: 600, borderRadius: "4px 0 0 4px" }}>이름</th>
                        <th style={{ padding: "8px 12px", background: "#0d2040", border: "1px solid #1a3558", textAlign: "left", color: "#6a9fc0", fontWeight: 400 }}>설명</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ep.params.map((p, j) => (
                        <tr key={j}>
                          <td style={{ padding: "8px 12px", border: "1px solid #1a3558" }}>
                            <code style={{ fontFamily: "monospace", color: "#60b8f8" }}>{p.name}</code>
                          </td>
                          <td style={{ padding: "8px 12px", border: "1px solid #1a3558", color: "#c0d8f0" }}>{p.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#6a9fc0", marginBottom: 8 }}>예제 요청</p>
                <code style={{ display: "block", background: "#060a12", border: "1px solid #1a3558", borderRadius: 8, padding: "12px 16px", fontSize: "0.875rem", color: "#60b8f8", fontFamily: "monospace", wordBreak: "break-all" }}>
                  GET {ep.example}
                </code>
              </div>

              <div>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#6a9fc0", marginBottom: 8 }}>응답 예시</p>
                <pre style={{ background: "#060a12", border: "1px solid #1a3558", borderRadius: 8, padding: "16px", fontSize: "0.8125rem", color: "#c0d8f0", fontFamily: "monospace", overflow: "auto", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                  {ep.response}
                </pre>
              </div>
            </div>
          </div>
        ))}

        {/* Error codes */}
        <div style={{ background: "#0a1a30", border: "1px solid #1a3558", borderRadius: 14, padding: "24px" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: 16 }}>오류 코드</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <tbody>
              {[
                { code: "200", msg: "성공" },
                { code: "404", msg: "블로그 또는 글을 찾을 수 없음 (비공개 블로그 포함)" },
                { code: "500", msg: "서버 내부 오류" },
              ].map(r => (
                <tr key={r.code}>
                  <td style={{ padding: "10px 12px", border: "1px solid #1a3558", width: 80 }}>
                    <code style={{ fontFamily: "monospace", color: r.code === "200" ? "#16a34a" : "#ef4444", fontWeight: 700 }}>{r.code}</code>
                  </td>
                  <td style={{ padding: "10px 12px", border: "1px solid #1a3558", color: "#c0d8f0" }}>{r.msg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RSS */}
        <div style={{ marginTop: 24, background: "#0a1a30", border: "1px solid #1a3558", borderRadius: 14, padding: "24px" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: 8 }}>RSS 피드</h2>
          <p style={{ color: "#6a9fc0", fontSize: "0.9375rem", marginBottom: 12 }}>각 블로그는 RSS 2.0 피드를 제공합니다.</p>
          <code style={{ display: "block", background: "#060a12", border: "1px solid #1a3558", borderRadius: 8, padding: "12px 16px", fontSize: "0.875rem", color: "#60b8f8", fontFamily: "monospace" }}>
            GET https://{"<slug>"}.krl.kr/rss.xml
          </code>
        </div>

        <p style={{ marginTop: 32, textAlign: "center", color: "#1a3558", fontSize: "0.8125rem" }}>
          KRL.KR Blog API · 무료 · 공개 블로그에 한해 제공
        </p>
      </div>
    </div>
  );
}
