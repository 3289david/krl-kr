import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { z } from "zod";
import { verifyPassword, createToken, getSessionCookieOptions, checkRateLimit } from "@/lib/auth";

const LoginSchema = z.object({
  email: z.string().email("유효한 이메일을 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
  remember: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for") ??
      "unknown";

    // Rate limit: 5 attempts per minute per IP
    const rateLimit = await checkRateLimit({
      key: `login:${ip}`,
      limit: 5,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "로그인 시도가 너무 많습니다. 1분 후 다시 시도해주세요.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const db = getDB(request);

    // Find user
    const user = await db
      .prepare("SELECT * FROM users WHERE email = ? LIMIT 1")
      .bind(email.toLowerCase())
      .first<{
        id: string;
        email: string;
        name: string | null;
        password_hash: string | null;
        plan: string;
      }>();

    // Timing-safe: always run verify even if user not found
    const dummyHash = "pbkdf2:0000000000000000000000000000000000000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000";
    const passwordValid = await verifyPassword(
      password,
      user?.password_hash ?? dummyHash
    );

    if (!user || !passwordValid) {
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다.", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    // Create session token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
      },
    });

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
    console.error("[/api/auth/login] Error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
