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

/**
 * Verify an altcha payload on the server.
 * The payload is a base64-encoded JSON from the altcha widget.
 */
export async function verifyAltcha(payload: string | null | undefined): Promise<boolean> {
  if (!payload) return false;
  try {
    const raw = JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as {
      algorithm: string;
      challenge: string;
      number: number;
      salt: string;
      signature: string;
    };
    const { challenge, number, salt, signature } = raw;
    if (!challenge || number === undefined || !salt || !signature) return false;

    const hmacSecret = process.env.ALTCHA_HMAC_KEY ?? "krl-kr-altcha-secret-2026";
    const encoder = new TextEncoder();

    // 1. Verify PoW: SHA-256(salt + number) === challenge
    const hashBuf = await crypto.subtle.digest("SHA-256", encoder.encode(`${salt}${number}`));
    const hashHex = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (hashHex !== challenge) return false;

    // 2. Verify HMAC-SHA256(challenge, secret) === signature
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(hmacSecret),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const sigBytes = Uint8Array.from(
      (signature.match(/.{1,2}/g) ?? []).map((h: string) => parseInt(h, 16))
    );
    return await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(challenge));
  } catch {
    return false;
  }
}
