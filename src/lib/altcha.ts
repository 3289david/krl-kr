/**
 * Server-side Altcha PoW utilities.
 * Import ONLY in Server Components or API routes (server-only).
 * Do NOT import from "use client" files.
 */

import { randomBytes } from "crypto";

const HMAC_SECRET = process.env.ALTCHA_HMAC_KEY ?? "krl-kr-altcha-secret-2026";
const MAX_NUMBER = 50_000;

// ─── Challenge creation (server-side, called during SSR) ──────────────────────
export async function createAltchaChallenge(): Promise<{
  algorithm: string;
  challenge: string;
  maxnumber: number;
  salt: string;
  signature: string;
}> {
  const salt = randomBytes(12).toString("hex");
  const target = Math.floor(Math.random() * MAX_NUMBER);
  const encoder = new TextEncoder();

  const hashBuf = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${salt}${target}`)
  );
  const challenge = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(HMAC_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(challenge));
  const signature = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { algorithm: "SHA-256", challenge, maxnumber: MAX_NUMBER, salt, signature };
}

// ─── Verification (API routes) ────────────────────────────────────────────────
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

    const encoder = new TextEncoder();

    // 1. PoW: SHA-256(salt + number) === challenge
    const hashBuf = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(`${salt}${number}`)
    );
    const hashHex = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (hashHex !== challenge) return false;

    // 2. HMAC signature
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(HMAC_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = Uint8Array.from(
      (signature.match(/.{1,2}/g) ?? []).map((h: string) => parseInt(h, 16))
    );
    return await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(challenge));
  } catch {
    return false;
  }
}
