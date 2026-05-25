import Link from "next/link";

export default function CookiePolicyPage() {
  return (
    <main>
      <section className="section">
        <div className="container" style={{ maxWidth: "720px" }}>
          <div style={{ marginBottom: "48px" }}>
            <p className="eyebrow" style={{ marginBottom: "16px" }}>법적 고지</p>
            <h1 style={{ marginBottom: "16px" }}>쿠키 정책</h1>
            <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem" }}>
              시행일: 2025년 1월 1일 &nbsp;|&nbsp; 최종 수정일: 2025년 1월 1일
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "40px", lineHeight: 1.8, color: "var(--color-body)" }}>

            <section>
              <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>1. 쿠키란 무엇인가요?</h2>
              <p>
                쿠키(Cookie)는 웹사이트를 방문할 때 브라우저에 저장되는 작은 텍스트 파일입니다.
                쿠키는 웹사이트가 사용자의 기본 설정을 기억하고, 로그인 상태를 유지하며, 서비스 이용 통계를 분석하는 데 사용됩니다.
              </p>
            </section>

            <section>
              <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>2. KRL.KR이 사용하는 쿠키</h2>
              <p style={{ marginBottom: "16px" }}>KRL.KR은 다음과 같은 유형의 쿠키를 사용합니다:</p>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {[
                  {
                    name: "필수 쿠키 (Strictly Necessary)",
                    desc: "서비스 운영에 반드시 필요한 쿠키입니다. 이 쿠키 없이는 로그인, 보안 기능 등이 작동하지 않습니다.",
                    examples: ["krl_session — JWT 로그인 세션 (HttpOnly, Secure, SameSite=Lax)"],
                    canDisable: false,
                  },
                  {
                    name: "기능 쿠키 (Functional)",
                    desc: "사용자의 설정과 선호도를 기억하는 쿠키입니다.",
                    examples: ["테마 설정 (라이트/다크)", "언어 설정"],
                    canDisable: true,
                  },
                  {
                    name: "분석 쿠키 (Analytics)",
                    desc: "서비스 이용 패턴을 분석하여 서비스를 개선하는 데 사용되는 쿠키입니다. 모든 데이터는 익명으로 처리됩니다.",
                    examples: ["페이지뷰 집계", "기능 사용 통계"],
                    canDisable: true,
                  },
                ].map((c) => (
                  <div key={c.name} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                      <p style={{ fontWeight: 700, fontSize: "1rem" }}>{c.name}</p>
                      <span className="badge" style={{
                        background: c.canDisable ? "var(--color-surface-card)" : "var(--color-ink)",
                        color: c.canDisable ? "var(--color-muted)" : "var(--color-canvas)",
                        border: "none",
                        fontSize: "0.6875rem",
                      }}>
                        {c.canDisable ? "선택적" : "필수"}
                      </span>
                    </div>
                    <p style={{ color: "var(--color-muted)", marginBottom: "12px", fontSize: "0.9375rem" }}>{c.desc}</p>
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                      {c.examples.map((e) => (
                        <li key={e} style={{ fontSize: "0.875rem", color: "var(--color-muted)", fontFamily: "var(--font-mono)", paddingLeft: "12px", borderLeft: "2px solid var(--color-hairline-strong)" }}>
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>3. 세션 쿠키 세부 정보</h2>
              <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-hairline-strong)" }}>
                      {["쿠키명", "목적", "유효기간", "유형"].map((h) => (
                        <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "krl_session", purpose: "사용자 인증 (JWT)", duration: "7일", type: "필수" },
                      { name: "krl_theme", purpose: "테마 설정 저장", duration: "1년", type: "기능" },
                    ].map((row, i) => (
                      <tr key={row.name} style={{ borderBottom: i === 0 ? "1px solid var(--color-hairline)" : "none" }}>
                        <td style={{ padding: "14px 20px", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>{row.name}</td>
                        <td style={{ padding: "14px 20px", color: "var(--color-muted)" }}>{row.purpose}</td>
                        <td style={{ padding: "14px 20px", color: "var(--color-muted)" }}>{row.duration}</td>
                        <td style={{ padding: "14px 20px", color: "var(--color-muted)" }}>{row.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>4. 제3자 쿠키</h2>
              <p>
                KRL.KR은 현재 광고 목적의 제3자 쿠키를 사용하지 않습니다.
                향후 외부 분석 도구를 도입할 경우 본 정책을 업데이트하고 사전에 고지하겠습니다.
              </p>
            </section>

            <section>
              <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>5. 쿠키 관리 방법</h2>
              <p style={{ marginBottom: "16px" }}>
                브라우저 설정을 통해 쿠키를 관리하거나 삭제할 수 있습니다.
                단, 필수 쿠키를 비활성화하면 로그인 등 서비스의 핵심 기능을 이용할 수 없습니다.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { browser: "Google Chrome", url: "chrome://settings/cookies" },
                  { browser: "Mozilla Firefox", url: "about:preferences#privacy" },
                  { browser: "Apple Safari", url: "환경설정 > 개인 정보 보호 > 쿠키" },
                  { browser: "Microsoft Edge", url: "edge://settings/privacy" },
                ].map((b) => (
                  <div key={b.browser} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", background: "var(--color-surface-card)", borderRadius: "var(--radius-lg)" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9375rem", minWidth: "160px" }}>{b.browser}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--color-muted)" }}>{b.url}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>6. 정책 변경</h2>
              <p>
                본 쿠키 정책은 법령 변경 또는 서비스 변경에 따라 업데이트될 수 있습니다.
                중요한 변경 사항은 서비스 내 공지 또는 이메일로 사전 안내드립니다.
              </p>
            </section>

            <section>
              <h2 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>7. 문의</h2>
              <p>
                쿠키 관련 문의사항은{" "}
                <a href="mailto:support@krl.kr" style={{ color: "var(--color-ink)" }}>support@krl.kr</a>
                로 연락해주세요.
              </p>
            </section>

          </div>

          <div style={{ marginTop: "48px", paddingTop: "32px", borderTop: "1px solid var(--color-hairline)", display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <Link href="/legal/terms" style={{ color: "var(--color-muted)", fontSize: "0.9rem", textDecoration: "none" }}>이용약관</Link>
            <Link href="/legal/privacy" style={{ color: "var(--color-muted)", fontSize: "0.9rem", textDecoration: "none" }}>개인정보처리방침</Link>
            <Link href="/legal/refund" style={{ color: "var(--color-muted)", fontSize: "0.9rem", textDecoration: "none" }}>환불 정책</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
