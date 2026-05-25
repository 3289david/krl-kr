import Link from "next/link";

export default function SupportPage() {
  return (
    <main>
      <section className="section">
        <div className="container" style={{ maxWidth: "720px" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <p className="eyebrow" style={{ justifyContent: "center", marginBottom: "24px" }}>지원</p>
            <h1 style={{ marginBottom: "20px" }}>KRL.KR을 후원해주세요</h1>
            <p style={{ fontSize: "1.125rem", color: "var(--color-muted)", lineHeight: 1.6 }}>
              KRL.KR은 혼자 개발하고 운영하는 독립 프로젝트입니다.
              여러분의 후원은 서버 비용과 지속적인 개발에 직접 사용됩니다.
            </p>
          </div>

          {/* Donation card */}
          <div style={{
            background: "var(--color-ink)", borderRadius: "var(--radius-xl)",
            padding: "48px", textAlign: "center", marginBottom: "48px",
          }}>
            <div style={{ marginBottom: "24px" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-arc)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h2 style={{ color: "var(--color-canvas)", marginBottom: "16px" }}>커피 한 잔으로 응원해주세요</h2>
            <p style={{ color: "rgba(243,240,238,0.6)", marginBottom: "32px", lineHeight: 1.6 }}>
              Buy Me a Coffee를 통해 간편하게 후원할 수 있습니다.
              모든 후원은 서버 비용, 도메인 유지, 기능 개발에 사용됩니다.
            </p>
            <a
              href="https://buymeacoffee.com/rukkitofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-lg btn-pill"
              style={{ textDecoration: "none", background: "#FFDD00", color: "#000000", border: "none" }}
            >
              Buy me a coffee
            </a>
          </div>

          {/* What support goes to */}
          <div style={{ marginBottom: "48px" }}>
            <h2 style={{ marginBottom: "24px", textAlign: "center" }}>후원금 사용 내역</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {[
                { pct: "50%", title: "서버 비용", desc: "Cloudflare Workers, D1 데이터베이스, R2 스토리지 비용" },
                { pct: "30%", title: "기능 개발", desc: "새로운 기능 연구 및 개발에 투자되는 시간" },
                { pct: "20%", title: "도구/인프라", desc: "개발 도구, 도메인, 모니터링 서비스" },
              ].map((item) => (
                <div key={item.title} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px", textAlign: "center" }}>
                  <p style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--color-arc)", marginBottom: "8px" }}>{item.pct}</p>
                  <p style={{ fontWeight: 600, marginBottom: "8px" }}>{item.title}</p>
                  <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Other ways to support */}
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "32px" }}>
            <h3 style={{ fontWeight: 600, marginBottom: "16px" }}>다른 방법으로 지원하기</h3>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                "주변에 KRL.KR을 추천해주세요",
                "버그를 발견하면 contact@rukkit.net로 알려주세요",
                "기능 제안을 보내주세요",
                "프로/비즈니스 플랜을 구독해주세요",
              ].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.9375rem", color: "var(--color-body)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ textAlign: "center", marginTop: "48px" }}>
            <p style={{ color: "var(--color-muted)", marginBottom: "16px" }}>후원해주셔서 감사합니다.</p>
            <Link href="/" style={{ color: "var(--color-ink)" }}>홈으로 돌아가기</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
