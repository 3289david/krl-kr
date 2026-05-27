"use client";
import Script from "next/script";
import React, { useState, useEffect } from "react";

export function AltchaWidget({ name = "altcha" }: { name?: string }) {
  // IMPORTANT: use useEffect (not useState initializer) so the challenge URL
  // is computed purely client-side and is NEVER baked into SSR/pre-rendered HTML.
  // If the URL were in the server HTML, Cloudflare could cache the page and serve
  // a stale challenge URL to every user (s-maxage=31536000 on auth pages).
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null);

  useEffect(() => {
    // Fresh timestamp on every page load — unique URL, never cached by Cloudflare
    setChallengeUrl(`/api/challenge?_=${Date.now()}`);
  }, []);

  // Don't render during SSR or initial hydration — only mount client-side
  // so the challengeurl is always fresh and never in cached HTML
  if (!challengeUrl) return null;

  return (
    <>
      <Script src="/altcha/altcha.min.js" strategy="afterInteractive" />
      {React.createElement("altcha-widget", {
        challengeurl: challengeUrl,
        name,
        auto: "onload",
        hidefooter: "",
        style: {
          "--altcha-border-radius": "10px",
          "--altcha-border-width": "1px",
          "--altcha-color-border": "var(--color-hairline-strong)",
          "--altcha-max-width": "100%",
          width: "100%",
        } as React.CSSProperties,
      })}
    </>
  );
}

// verifyAltcha has been moved to src/lib/altcha.ts (server-only)
// Do NOT add server logic here — this file is "use client".
