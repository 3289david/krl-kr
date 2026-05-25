import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { z } from "zod";
import { generateId, generateApiKey } from "@/lib/utils";
import { hashPassword, createToken, getSessionCookieOptions } from "@/lib/auth";

const RegisterSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력해주세요."),
  password: z
    .string()
    .min(8, "비밀번호는 최소 8자 이상이어야 합니다.")
    .max(72, "비밀번호가 너무 깁니다."),
  name: z.string().min(1).max(50).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;
    const db = getDB(request);

    if (!db) {
      return NextResponse.json(
        { error: "데이터베이스 연결에 실패했습니다.", code: "DB_ERROR" },
        { status: 503 }
      );
    }

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

    // Create user
    await db
      .prepare(
        `INSERT INTO users (id, email, name, password_hash, plan, api_key, avatar_url, verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'free', ?, NULL, 0, ?, ?)`
      )
      .bind(userId, email.toLowerCase(), name ?? null, passwordHash, apiKey, now, now)
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
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
