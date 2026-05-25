/**
 * KRL.KR — Authentication
 * JWT-based auth with bcrypt password hashing
 * Compatible with Cloudflare Workers (edge runtime)
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import type { D1Database, User } from "./db";
import { getUserById } from "./db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "krl-kr-dev-secret-change-in-production"
);

const SESSION_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
const COOKIE_NAME = "krl_session";

export interface SessionPayload {
  userId: string;
  email: string;
  plan: string;
  iat?: number;
  exp?: number;
}

// ─── Token creation ───────────────────────────────────────────────────────────
export async function createToken(payload: Omit<SessionPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .setIssuer("krl.kr")
    .setAudience("krl.kr")
    .sign(JWT_SECRET);
}

// ─── Token verification ───────────────────────────────────────────────────────
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: "krl.kr",
      audience: "krl.kr",
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Session from cookies ─────────────────────────────────────────────────────
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ─── Session from request ──────────────────────────────────────────────────────
export async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  const token =
    request.cookies.get(COOKIE_NAME)?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  return verifyToken(token);
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────
export function getSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_DURATION,
    path: "/",
  };
}

// ─── Password hashing (using Web Crypto for edge compatibility) ────────────────
export async function hashPassword(password: string): Promise<string> {
  // Use PBKDF2 via Web Crypto (edge-compatible)
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 210000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(bits);
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(hashArray).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2:${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [, saltHex, hashHex] = stored.split(":");
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: 210000,
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );
    const hashArray = new Uint8Array(bits);
    const computedHex = Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return computedHex === hashHex;
  } catch {
    return false;
  }
}

// ─── API Key auth ──────────────────────────────────────────────────────────────
export async function authenticateApiKey(
  db: D1Database,
  apiKey: string
): Promise<User | null> {
  const result = await db
    .prepare(
      `SELECT u.* FROM users u
       JOIN api_keys ak ON ak.user_id = u.id
       WHERE ak.key_hash = ? AND (ak.expires_at IS NULL OR ak.expires_at > ?)
       LIMIT 1`
    )
    .bind(await hashApiKey(apiKey), Date.now())
    .first<User>();

  if (result) {
    // Update last_used_at
    await db
      .prepare("UPDATE api_keys SET last_used_at = ? WHERE key_hash = ?")
      .bind(Date.now(), await hashApiKey(apiKey))
      .run();
  }

  return result;
}

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Auth middleware helper ───────────────────────────────────────────────────
export async function requireAuth(
  db: D1Database,
  request: NextRequest
): Promise<{ user: User; error?: never } | { user?: never; error: Response }> {
  // Try cookie/JWT first
  const session = await getSessionFromRequest(request);
  if (session) {
    const user = await getUserById(db, session.userId);
    if (user) return { user };
  }

  // Try API key
  const apiKey =
    request.headers.get("X-API-Key") ??
    request.headers.get("Authorization")?.replace("Bearer ", "");

  if (apiKey?.startsWith("krl_")) {
    const user = await authenticateApiKey(db, apiKey);
    if (user) return { user };
  }

  return {
    error: Response.json(
      { error: "인증이 필요합니다.", code: "UNAUTHORIZED" },
      { status: 401 }
    ),
  };
}

// ─── Rate limiting (simple in-memory + KV) ────────────────────────────────────
interface RateLimitConfig {
  key: string;
  limit: number;
  windowMs: number;
}

// Simple in-memory rate limiter for edge (stateless per worker instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(config: RateLimitConfig): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const existing = rateLimitMap.get(config.key);

  if (!existing || now > existing.resetAt) {
    const resetAt = now + config.windowMs;
    rateLimitMap.set(config.key, { count: 1, resetAt });
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }

  if (existing.count >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: config.limit - existing.count,
    resetAt: existing.resetAt,
  };
}
