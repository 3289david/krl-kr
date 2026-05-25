/**
 * KRL.KR — Short Link Redirect Handler
 * Server component: looks up slug, records analytics, redirects
 */
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { generateId, isExpired, md5 } from "@/lib/utils";
import type { Metadata } from "next";
import { db } from "@/lib/db/postgres";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const link = await db
      .prepare("SELECT title, description, og_image FROM links WHERE slug = ? AND is_active = 1 LIMIT 1")
      .bind(slug)
      .first<{ title?: string; description?: string; og_image?: string }>();

    if (!link) return { title: "링크를 찾을 수 없습니다 | KRL.KR" };

    return {
      title: link.title ?? `${slug} | KRL.KR`,
      description: link.description,
      openGraph: {
        images: link.og_image ? [{ url: link.og_image }] : [],
      },
    };
  } catch {
    return { title: `${slug} | KRL.KR` };
  }
}

export default async function SlugPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;

  // Look up the link
  let link: {
    id: string;
    original_url: string;
    password_hash: string | null;
    expires_at: number | null;
    max_clicks: number | null;
    click_count: number;
    is_dynamic: number;
    ios_url: string | null;
    android_url: string | null;
    fallback_url: string | null;
    geo_rules: string | null;
    device_rules: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
  } | null;

  try {
    link = await db
      .prepare(
        `SELECT * FROM links WHERE slug = ? AND is_active = 1 LIMIT 1`
      )
      .bind(slug)
      .first<{
      id: string;
      original_url: string;
      password_hash: string | null;
      expires_at: number | null;
      max_clicks: number | null;
      click_count: number;
      is_dynamic: number;
      ios_url: string | null;
      android_url: string | null;
      fallback_url: string | null;
      geo_rules: string | null;
      device_rules: string | null;
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
    }>();
  } catch (err) {
    console.error("[slug] DB error:", err);
    // DB unavailable — show maintenance page instead of 500
    return <ServiceUnavailablePage />;
  }

  if (!link) {
    notFound();
  }

  // Check expiry
  if (isExpired(link.expires_at)) {
    return (
      <ExpiredPage slug={slug} />
    );
  }

  // Check max clicks
  if (link.max_clicks !== null && link.click_count >= link.max_clicks) {
    return <MaxClicksPage slug={slug} />;
  }

  // Check password
  if (link.password_hash) {
    const providedPassword = typeof query.p === "string" ? query.p : null;
    if (!providedPassword) {
      redirect(`/${slug}/locked`);
    }
    // Verify password
    const { verifyPassword } = await import("@/lib/auth");
    const valid = await verifyPassword(providedPassword, link.password_hash);
    if (!valid) {
      redirect(`/${slug}/locked?error=1`);
    }
  }

  // Get request headers for analytics
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") ?? "";
  const ip = headersList.get("cf-connecting-ip") ??
             headersList.get("x-forwarded-for") ??
             "unknown";
  const country = headersList.get("cf-ipcountry") ?? null;
  const city = headersList.get("cf-ipcity") ?? null;
  const region = headersList.get("cf-region") ?? null;
  const referer = headersList.get("referer") ?? null;

  // Determine device type
  const { getDeviceType, extractDomain } = await import("@/lib/utils");
  const deviceType = getDeviceType(userAgent);

  // Parse UA for browser/OS
  let browser: string | null = null;
  let os: string | null = null;

  if (userAgent) {
    // Simple UA parsing without library
    if (/Chrome\/[\d.]+/.test(userAgent) && !/Edg\//.test(userAgent)) browser = "Chrome";
    else if (/Firefox\/[\d.]+/.test(userAgent)) browser = "Firefox";
    else if (/Safari\/[\d.]+/.test(userAgent) && !/Chrome/.test(userAgent)) browser = "Safari";
    else if (/Edg\/[\d.]+/.test(userAgent)) browser = "Edge";
    else browser = "Other";

    if (/Windows/.test(userAgent)) os = "Windows";
    else if (/Mac OS X/.test(userAgent)) os = "macOS";
    else if (/Android/.test(userAgent)) os = "Android";
    else if (/iPhone|iPad/.test(userAgent)) os = "iOS";
    else if (/Linux/.test(userAgent)) os = "Linux";
    else os = "Other";
  }

  // Hash IP for privacy
  const ipHash = await md5(ip);

  // Check if unique (simplified — in production use KV)
  let isUnique = true;
  try {
    const recentClick = await db
      .prepare(
        `SELECT id FROM clicks WHERE link_id = ? AND ip_hash = ? AND clicked_at > ? LIMIT 1`
      )
      .bind(link.id, ipHash, Date.now() - 24 * 60 * 60 * 1000)
      .first();
    isUnique = !recentClick;
  } catch {
    // Analytics failure shouldn't block redirect
  }

  // Record click (async — don't await to speed up redirect)
  const clickId = generateId("clk");
  db.prepare(
    `INSERT INTO clicks (
      id, link_id, clicked_at, country, city, region,
      device_type, browser, os, referer, referer_domain, user_agent, ip_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      clickId, link.id, Date.now(), country, city, region,
      deviceType, browser, os,
      referer, referer ? extractDomain(referer) : null,
      userAgent.substring(0, 500), ipHash
    )
    .run()
    .catch(console.error);

  // Update click count
  if (isUnique) {
    db.prepare(
      "UPDATE links SET click_count = click_count + 1, unique_count = unique_count + 1 WHERE id = ?"
    )
      .bind(link.id)
      .run()
      .catch(console.error);
  } else {
    db.prepare(
      "UPDATE links SET click_count = click_count + 1 WHERE id = ?"
    )
      .bind(link.id)
      .run()
      .catch(console.error);
  }

  // Determine redirect URL
  let targetUrl = link.original_url;

  // Device-based redirect
  if (link.device_rules) {
    try {
      const rules = JSON.parse(link.device_rules) as Array<{ device: string; url: string }>;
      for (const rule of rules) {
        if (rule.device === deviceType || (rule.device === "mobile" && deviceType === "mobile")) {
          if (rule.url) {
            targetUrl = rule.url;
            break;
          }
        }
      }
    } catch {
      // Invalid JSON, use original
    }
  }

  // App links: iOS / Android specific
  if (os === "iOS" && link.ios_url) {
    targetUrl = link.ios_url;
  } else if (os === "Android" && link.android_url) {
    targetUrl = link.android_url;
  }

  // Geo-based redirect
  if (link.geo_rules && country) {
    try {
      const rules = JSON.parse(link.geo_rules) as Array<{ country: string; url: string }>;
      const geoRule = rules.find((r) => r.country.toUpperCase() === country.toUpperCase());
      if (geoRule?.url) {
        targetUrl = geoRule.url;
      }
    } catch {
      // Invalid JSON, use original
    }
  }

  // Append UTM params if configured
  if (link.utm_source || link.utm_medium || link.utm_campaign) {
    try {
      const url = new URL(targetUrl);
      if (link.utm_source && !url.searchParams.has("utm_source"))
        url.searchParams.set("utm_source", link.utm_source);
      if (link.utm_medium && !url.searchParams.has("utm_medium"))
        url.searchParams.set("utm_medium", link.utm_medium);
      if (link.utm_campaign && !url.searchParams.has("utm_campaign"))
        url.searchParams.set("utm_campaign", link.utm_campaign);
      targetUrl = url.toString();
    } catch {
      // Invalid URL, use as-is
    }
  }

  // Perform redirect (308 for SEO, 302 for dynamic)
  redirect(targetUrl);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ExpiredPage({ slug }: { slug: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-canvas)",
        padding: "24px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "400px" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "var(--color-surface-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--color-muted)" }}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            marginBottom: "12px",
          }}
        >
          링크가 만료되었습니다
        </h1>
        <p style={{ color: "var(--color-muted)", marginBottom: "32px" }}>
          <code
            style={{
              fontFamily: "var(--font-mono)",
              background: "var(--color-surface-card)",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "0.9em",
            }}
          >
            krl.kr/{slug}
          </code>{" "}
          링크의 유효 기간이 지났습니다.
        </p>
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 24px",
            background: "var(--color-ink)",
            color: "var(--color-canvas)",
            borderRadius: "9999px",
            textDecoration: "none",
            fontSize: "0.9375rem",
            fontWeight: 500,
          }}
        >
          새 링크 만들기
        </a>
      </div>
    </div>
  );
}

function ServiceUnavailablePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-canvas)",
        padding: "24px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "400px" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "var(--color-surface-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--color-muted)" }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 500, letterSpacing: "-0.02em", marginBottom: "12px" }}>
          서비스 점검 중
        </h1>
        <p style={{ color: "var(--color-muted)", marginBottom: "32px" }}>
          잠시 서버 점검 중입니다. 잠시 후 다시 시도해주세요.
        </p>
        <a
          href="/"
          style={{
            display: "inline-flex",
            padding: "10px 24px",
            background: "var(--color-ink)",
            color: "var(--color-canvas)",
            borderRadius: "9999px",
            textDecoration: "none",
            fontSize: "0.9375rem",
            fontWeight: 500,
          }}
        >
          홈으로 돌아가기
        </a>
      </div>
    </div>
  );
}

function MaxClicksPage({ slug }: { slug: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-canvas)",
        padding: "24px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "400px" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "var(--color-surface-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--color-muted)" }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 500, letterSpacing: "-0.02em", marginBottom: "12px" }}>
          클릭 한도 초과
        </h1>
        <p style={{ color: "var(--color-muted)", marginBottom: "32px" }}>
          이 링크는 최대 클릭 수에 도달했습니다.
        </p>
        <a href="/" style={{ display: "inline-flex", padding: "10px 24px", background: "var(--color-ink)", color: "var(--color-canvas)", borderRadius: "9999px", textDecoration: "none", fontSize: "0.9375rem", fontWeight: 500 }}>
          새 링크 만들기
        </a>
      </div>
    </div>
  );
}
