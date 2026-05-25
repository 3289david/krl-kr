import { notFound } from "next/navigation";
import { getDB } from "@/lib/env";

interface BioPage {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  theme: string;
  links: string | null;
  social: string | null;
  view_count: number;
  created_at: string;
}

interface BioLink {
  title: string;
  url: string;
}

interface SocialLinks {
  twitter?: string;
  instagram?: string;
  github?: string;
  youtube?: string;
  tiktok?: string;
}

interface PageProps {
  params: Promise<{ username: string }>;
}

const SOCIAL_ICONS: Record<string, string> = {
  twitter: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
  github: "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z",
  youtube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  tiktok: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
};

const THEME_STYLES: Record<string, { bg: string; card: string; text: string; muted: string; border: string }> = {
  default: {
    bg: "#FCFBFA",
    card: "#FFFFFF",
    text: "#141413",
    muted: "#6E6D6B",
    border: "#E8E6E3",
  },
  dark: {
    bg: "#141413",
    card: "#1F1E1C",
    text: "#F3F0EE",
    muted: "#9B9896",
    border: "#2E2D2B",
  },
  minimal: {
    bg: "#FFFFFF",
    card: "#F7F6F5",
    text: "#000000",
    muted: "#717070",
    border: "#EBEBEB",
  },
};

export default async function BioPublicPage({ params }: PageProps) {
  const { username } = await params;

  const db = getDB();
  if (!db) notFound();

  const bioPage = await db
    .prepare("SELECT * FROM bio_pages WHERE username = ?")
    .bind(username)
    .first<BioPage>();

  if (!bioPage) notFound();

  // Increment view count
  await db
    .prepare("UPDATE bio_pages SET view_count = view_count + 1 WHERE id = ?")
    .bind(bioPage.id)
    .run();

  let links: BioLink[] = [];
  let social: SocialLinks = {};
  try { links = JSON.parse(bioPage.links || "[]"); } catch { /* ignore */ }
  try { social = JSON.parse(bioPage.social || "{}"); } catch { /* ignore */ }

  const theme = THEME_STYLES[bioPage.theme] || THEME_STYLES.default;

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 16px" }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        {/* Avatar + name */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          {bioPage.avatar_url ? (
            <img
              src={bioPage.avatar_url}
              alt={bioPage.display_name || bioPage.username}
              style={{ width: "88px", height: "88px", borderRadius: "50%", objectFit: "cover", margin: "0 auto 16px" }}
            />
          ) : (
            <div style={{
              width: "88px", height: "88px", borderRadius: "50%",
              background: theme.text, display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <span style={{ color: theme.bg, fontWeight: 700, fontSize: "2rem" }}>
                {(bioPage.display_name || bioPage.username).charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h1 style={{ color: theme.text, fontSize: "1.375rem", fontWeight: 700, marginBottom: "6px" }}>
            {bioPage.display_name || `@${bioPage.username}`}
          </h1>
          {bioPage.display_name && (
            <p style={{ color: theme.muted, fontSize: "0.9rem", marginBottom: "8px" }}>@{bioPage.username}</p>
          )}
          {bioPage.bio && (
            <p style={{ color: theme.muted, fontSize: "0.9375rem", lineHeight: 1.6, marginTop: "8px" }}>
              {bioPage.bio}
            </p>
          )}
        </div>

        {/* Social links */}
        {Object.keys(social).some((k) => social[k as keyof SocialLinks]) && (
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "28px" }}>
            {(Object.entries(social) as [string, string][]).filter(([, v]) => v).map(([platform, handle]) => {
              const icon = SOCIAL_ICONS[platform];
              if (!icon) return null;
              const urls: Record<string, string> = {
                twitter: `https://twitter.com/${handle}`,
                instagram: `https://instagram.com/${handle}`,
                github: `https://github.com/${handle}`,
                youtube: `https://youtube.com/@${handle}`,
                tiktok: `https://tiktok.com/@${handle}`,
              };
              return (
                <a
                  key={platform}
                  href={urls[platform]}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${platform}: @${handle}`}
                  style={{ color: theme.muted, transition: "color 0.15s" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={theme.muted}>
                    <path d={icon} />
                  </svg>
                </a>
              );
            })}
          </div>
        )}

        {/* Links */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                padding: "16px 24px",
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: "12px",
                textDecoration: "none",
                color: theme.text,
                fontWeight: 600,
                fontSize: "0.9375rem",
                textAlign: "center",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.8"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              {link.title}
            </a>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <a
            href="https://krl.kr"
            style={{ color: theme.muted, fontSize: "0.8125rem", textDecoration: "none", opacity: 0.6 }}
          >
            KRL.KR로 만들었습니다
          </a>
        </div>
      </div>
    </div>
  );
}
