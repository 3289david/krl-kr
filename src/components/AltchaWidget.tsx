"use client";
import Script from "next/script";
import React from "react";

export function AltchaWidget({ name = "altcha" }: { name?: string }) {
  return (
    <>
      <Script src="/altcha/altcha.min.js" strategy="afterInteractive" />
      {React.createElement("altcha-widget", {
        challengeurl: "/api/v1/altcha",
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
