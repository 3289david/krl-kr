"use client";
import Script from "next/script";
import React, { useState } from "react";

export function AltchaWidget({ name = "altcha" }: { name?: string }) {
  // Use Date.now() to generate a unique URL per page load.
  // This prevents Cloudflare CDN from serving a stale cached response,
  // and ensures every user gets a fresh PoW challenge.
  const [challengeUrl] = useState(() => `/api/challenge?_=${Date.now()}`);

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
