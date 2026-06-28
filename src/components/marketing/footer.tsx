import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        backgroundColor: "var(--color-surface-dark)",
        color: "var(--color-canvas)",
        padding: "64px 0 48px",
      }}
    >
      <div className="container">
        {/* Top headline */}
        <div
          style={{
            marginBottom: "48px",
            paddingBottom: "48px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "rgba(243,240,238,0.4)",
              marginBottom: "16px",
            }}
          >
            KRL.KR
          </p>
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--color-canvas)",
              maxWidth: "480px",
              lineHeight: 1.2,
            }}
          >
            무료 링크 단축 서비스,
            <br />
            KRL.KR
          </h2>
        </div>

        {/* Link grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "32px",
            marginBottom: "48px",
          }}
        >
          {/* Product */}
          <div>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "rgba(243,240,238,0.4)",
                marginBottom: "16px",
              }}
            >
              제품
            </p>
            {[
              { href: "/features", label: "기능 소개" },
              { href: "/docs", label: "API 문서" },
              { href: "/changelog", label: "업데이트" },
              { href: "/status", label: "서비스 상태" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "block",
                  fontSize: "0.9375rem",
                  fontWeight: 400,
                  color: "rgba(243,240,238,0.7)",
                  textDecoration: "none",
                  marginBottom: "10px",
                  transition: "color 0.15s ease",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Tools */}
          <div>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "rgba(243,240,238,0.4)",
                marginBottom: "16px",
              }}
            >
              도구
            </p>
            {[
              { href: "/qr", label: "QR 코드 생성기" },
              { href: "/tools/paste", label: "코드 공유 (Pastebin)" },
              { href: "/tools/drop", label: "파일 공유" },
              { href: "/tools/webhook", label: "웹훅 테스트" },
              { href: "/tools/bio", label: "Link-in-bio" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "block",
                  fontSize: "0.9375rem",
                  fontWeight: 400,
                  color: "rgba(243,240,238,0.7)",
                  textDecoration: "none",
                  marginBottom: "10px",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Company */}
          <div>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "rgba(243,240,238,0.4)",
                marginBottom: "16px",
              }}
            >
              회사
            </p>
            {[
              { href: "/about", label: "소개" },
              { href: "https://blog.krl.kr", label: "블로그" },
              { href: "/contact", label: "문의하기" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "block",
                  fontSize: "0.9375rem",
                  fontWeight: 400,
                  color: "rgba(243,240,238,0.7)",
                  textDecoration: "none",
                  marginBottom: "10px",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Legal */}
          <div>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "rgba(243,240,238,0.4)",
                marginBottom: "16px",
              }}
            >
              법적 고지
            </p>
            {[
              { href: "/legal/terms", label: "이용약관" },
              { href: "/legal/privacy", label: "개인정보처리방침" },
              { href: "/legal/cookies", label: "쿠키 정책" },
              { href: "/legal/refund", label: "환불 정책" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "block",
                  fontSize: "0.9375rem",
                  fontWeight: 400,
                  color: "rgba(243,240,238,0.7)",
                  textDecoration: "none",
                  marginBottom: "10px",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            paddingTop: "24px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <p
            style={{
              fontSize: "0.8125rem",
              color: "rgba(243,240,238,0.4)",
            }}
          >
            &copy; {currentYear} KRL.KR. All rights reserved.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "rgba(243,240,238,0.4)",
              }}
            >
              Powered by{" "}
              <span style={{ color: "rgba(243,240,238,0.6)" }}>Cloudflare</span>
            </p>

            {/* Social links */}
            <div style={{ display: "flex", gap: "16px" }}>
              {[
                {
                  href: "https://github.com/3289david/krl-kr",
                  label: "GitHub",
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  ),
                },
              ].map((social) => (
                <a
                  key={social.href}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  style={{
                    color: "rgba(243,240,238,0.4)",
                    transition: "color 0.15s ease",
                    textDecoration: "none",
                  }}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
