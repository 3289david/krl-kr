import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { z } from "zod";
import { generateId, generateApiKey } from "@/lib/utils";
import { hashPassword, createToken, getSessionCookieOptions, checkRateLimit } from "@/lib/auth";
import { verifyAltcha } from "@/lib/altcha";

const RegisterSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력해주세요."),
  password: z
    .string()
    .min(8, "비밀번호는 최소 8자 이상이어야 합니다.")
    .max(72, "비밀번호가 너무 깁니다."),
  name: z.string().min(1).max(50).optional(),
  altcha: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for") ??
      "unknown";

    // Rate limit: 5 registrations per hour per IP
    const rateLimit = await checkRateLimit({
      key: `register:${ip}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "잠시 후 다시 시도해주세요.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { email, password, name, altcha } = parsed.data;

    // Verify altcha proof-of-work (skip only in dev)
    const skipAltcha = process.env.SKIP_ALTCHA === "1";
    if (!skipAltcha) {
      const valid = await verifyAltcha(altcha);
      if (!valid) {
        return NextResponse.json(
          { error: "보안 인증을 완료해주세요. 잠시 후 다시 시도해주세요.", code: "ALTCHA_FAILED" },
          { status: 400 }
        );
      }
    }

    const db = getDB(request);

    // Check if email already exists
    const existing = await db
      .prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
      .bind(email.toLowerCase())
      .first();

    if (existing) {
      return NextResponse.json(
        { error: "이미 사용 중인 이메일 주소입니다.", code: "EMAIL_TAKEN" },
        { status: 409 }
      );
    }

    const userId = generateId("usr");
    const now = Date.now();
    const passwordHash = await hashPassword(password);
    const apiKey = generateApiKey();

    // Hash the API key for storage
    const encoder = new TextEncoder();
    const keyBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(apiKey));
    const keyHashHex = Array.from(new Uint8Array(keyBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Create user — store only key prefix in users.api_key (not plain text)
    await db
      .prepare(
        `INSERT INTO users (id, email, name, password_hash, plan, api_key, avatar_url, verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'free', ?, NULL, 0, ?, ?)`
      )
      .bind(userId, email.toLowerCase(), name ?? null, passwordHash, apiKey.substring(0, 12), now, now)
      .run();

    // Create default API key entry
    await db
      .prepare(
        `INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, scopes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        generateId("key"),
        userId,
        "기본 API 키",
        keyHashHex,
        apiKey.substring(0, 12),
        '["links:read","links:write","analytics:read"]',
        now
      )
      .run();

    // Create session token
    const token = await createToken({
      userId,
      email: email.toLowerCase(),
      plan: "free",
    });

    const response = NextResponse.json(
      {
        user: {
          id: userId,
          email: email.toLowerCase(),
          name: name ?? null,
          plan: "free",
        },
        api_key: apiKey, // Return once at registration
      },
      { status: 201 }
    );

    // Set session cookie
    const cookieOptions = getSessionCookieOptions();
    response.cookies.set({
      name: cookieOptions.name,
      value: token,
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      maxAge: cookieOptions.maxAge,
      path: cookieOptions.path,
    });

    return response;
  } catch (err) {
    console.error("[/api/auth/register] Error:", err);
    const message = err instanceof Error ? err.message : "";
    if (message.includes("DATABASE_URL") || message.includes("ECONNREFUSED") || message.includes("connect")) {
      return NextResponse.json(
        { error: "데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.", code: "DB_UNAVAILABLE" },
        { status: 503 }
      );
    }
    // PostgreSQL unique violation (email already taken — race condition)
    if (message.includes("unique") || message.includes("23505")) {
      return NextResponse.json(
        { error: "이미 사용 중인 이메일 주소입니다.", code: "EMAIL_TAKEN" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
