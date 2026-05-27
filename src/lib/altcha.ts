/**
 * Server-side Altcha PoW verification.
 * Import this in API routes (server-side only).
 * Do NOT import from AltchaWidget — that file is "use client".
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
