"use client";
import Script from "next/script";
import React, { useEffect, useId } from "react";

/**
 * AltchaWidget
 *
 * The challenge URL is patched in useEffect with a fresh browser timestamp so that
 * every page load hits a unique URL that no CDN can serve from cache.
 * Route: /api/challenge  (brand-new path — no stale Cloudflare cache history).
 */
export function AltchaWidget({ name = "altcha" }: { name?: string }) {
  const id = useId().replace(/:/g, "-");

  useEffect(() => {
    const widget = document.getElementById(id) as (HTMLElement & {
      verify?: () => void;
    }) | null;
    if (!widget) return;

    // Fresh URL with browser timestamp → bypasses any CDN-cached response
    widget.setAttribute("challengeurl", `/api/challenge?t=${Date.now()}`);

    // Start the PoW challenge programmatically
    if (typeof widget.verify === "function") {
      widget.verify();
    } else {
      // fallback for older altcha builds: set auto attribute and let widget re-init
      widget.setAttribute("auto", "onload");
    }
  }, [id]);

  return (
    <>
      {/* Load synchronously so the custom element is registered
          before connectedCallback fires on the widget element. */}
      <Script src="/altcha/altcha.min.js" strategy="beforeInteractive" />
      {React.createElement("altcha-widget", {
        id,
        name,
        // Placeholder URL (no auto) — useEffect immediately overwrites with
        // a timestamped URL and calls verify().
        challengeurl: "/api/challenge?t=0",
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

// verifyAltcha lives in src/lib/altcha.ts (server-only).
// Do NOT add server logic here — this file is "use client".
