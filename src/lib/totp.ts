/**
 * KRL.KR — TOTP (Time-based One-Time Password) Utility
 * Pure Node.js crypto, no external dependencies
 * RFC 6238 / RFC 4226 compliant
 */
import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer): string {
  let result = "";
  let bits = 0;
  let value = 0;
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return result;
}

function base32Decode(str: string): Buffer {
  const s = str.toUpperCase().replace(/=+$/, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of s) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * Generate a random 20-byte Base32-encoded TOTP secret
 */
export function generateSecret(): string {
  const buf = crypto.randomBytes(20);
  return base32Encode(buf);
}

/**
 * Compute TOTP code for a given time step
 */
function computeTOTP(secret: string, timeStep: number): string {
  const keyBuf = base32Decode(secret);
  const counterBuf = Buffer.alloc(8);
  // Write 8-byte big-endian counter
  const hi = Math.floor(timeStep / 0x100000000);
  const lo = timeStep >>> 0;
  counterBuf.writeUInt32BE(hi, 0);
  counterBuf.writeUInt32BE(lo, 4);

  const hmac = crypto.createHmac("sha1", keyBuf).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      (hmac[offset + 1] << 16) |
      (hmac[offset + 2] << 8) |
      hmac[offset + 3]) %
    1000000;
  return code.toString().padStart(6, "0");
}

/**
 * Get current TOTP code (30-second window)
 */
export function getTOTP(secret: string): string {
  const timeStep = Math.floor(Date.now() / 1000 / 30);
  return computeTOTP(secret, timeStep);
}

/**
 * Verify a TOTP token against current ±1 windows
 */
export function verifyTOTP(secret: string, token: string): boolean {
  const timeStep = Math.floor(Date.now() / 1000 / 30);
  for (const delta of [-1, 0, 1]) {
    if (computeTOTP(secret, timeStep + delta) === token) return true;
  }
  return false;
}

/**
 * Generate otpauth:// URI for QR code
 */
export function getQRUri(secret: string, email: string): string {
  const issuer = "KRL.KR";
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
