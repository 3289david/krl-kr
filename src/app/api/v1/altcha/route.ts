import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

const ALTCHA_HMAC_SECRET = process.env.ALTCHA_HMAC_KEY ?? "krl-kr-altcha-secret-2026";
const MAX_NUMBER = 50000; // difficulty

export async function GET() {
  try {
    // Generate a random salt
    const salt = randomBytes(12).toString("hex");
    // Pick a random target number
    const targetNumber = Math.floor(Math.random() * MAX_NUMBER);
    // Compute challenge = SHA-256(salt + number)
    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest("SHA-256", encoder.encode(`${salt}${targetNumber}`));
    const challenge = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Sign the challenge with HMAC-SHA256
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(ALTCHA_HMAC_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(challenge));
    const signature = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return NextResponse.json({
      algorithm: "SHA-256",
      challenge,
      maxnumber: MAX_NUMBER,
      salt,
      signature,
    }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Altcha challenge error:", err);
    return NextResponse.json({ error: "Challenge generation failed" }, { status: 500 });
  }
}
