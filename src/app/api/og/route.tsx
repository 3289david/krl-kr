import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const THEMES = {
  dark: { bg: "#0f0f0f", card: "#1a1a1a", border: "#333", text: "#ffffff", muted: "#888", accent: "#6366f1" },
  light: { bg: "#f8f8f8", card: "#ffffff", border: "#e0e0e0", text: "#111111", muted: "#666", accent: "#6366f1" },
  blue: { bg: "#0a0a2e", card: "#0f0f4a", border: "#2020aa", text: "#ffffff", muted: "#8888cc", accent: "#60a5fa" },
  green: { bg: "#0a1a0a", card: "#0f2a0f", border: "#1a5a1a", text: "#ffffff", muted: "#66aa66", accent: "#34d399" },
  purple: { bg: "#1a0a2e", card: "#2a0f4a", border: "#6a1aaa", text: "#ffffff", muted: "#aa88cc", accent: "#a78bfa" },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") ?? "KRL.KR").slice(0, 80);
  const description = (searchParams.get("description") ?? "Korea Link Registry — 무료 링크 단축, QR코드, 호스팅 서비스").slice(0, 140);
  const site = (searchParams.get("site") ?? "KRL.KR").slice(0, 40);
  const tag = (searchParams.get("tag") ?? "").slice(0, 30);
  const themeName = (searchParams.get("theme") ?? "dark") as keyof typeof THEMES;
  const theme = THEMES[themeName] ?? THEMES.dark;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: theme.bg,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Background grid */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${theme.border} 1px, transparent 1px), linear-gradient(90deg, ${theme.border} 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          opacity: 0.3,
          display: "flex",
        }} />

        {/* Glow */}
        <div style={{
          position: "absolute",
          top: "-100px",
          right: "-100px",
          width: "500px",
          height: "500px",
          background: theme.accent,
          borderRadius: "50%",
          filter: "blur(120px)",
          opacity: 0.15,
          display: "flex",
        }} />

        {/* Card */}
        <div style={{
          background: theme.card,
          border: `1px solid ${theme.border}`,
          borderRadius: "24px",
          padding: "48px 56px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          position: "relative",
        }}>
          {/* Tag */}
          {tag && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <div style={{
                background: theme.accent,
                color: "#fff",
                borderRadius: "20px",
                padding: "6px 16px",
                fontSize: "14px",
                fontWeight: 600,
                display: "flex",
              }}>
                {tag}
              </div>
            </div>
          )}

          {/* Title */}
          <div style={{
            fontSize: title.length > 40 ? "40px" : "56px",
            fontWeight: 800,
            color: theme.text,
            lineHeight: 1.2,
            letterSpacing: "-1px",
            display: "flex",
          }}>
            {title}
          </div>

          {/* Description */}
          {description && (
            <div style={{
              fontSize: "22px",
              color: theme.muted,
              lineHeight: 1.5,
              display: "flex",
              maxWidth: "900px",
            }}>
              {description}
            </div>
          )}

          {/* Footer */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginTop: "8px",
          }}>
            <div style={{
              width: "36px",
              height: "36px",
              background: theme.accent,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <div style={{ color: "#fff", fontSize: "18px", fontWeight: 900, display: "flex" }}>K</div>
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: theme.muted, display: "flex" }}>{site}</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
