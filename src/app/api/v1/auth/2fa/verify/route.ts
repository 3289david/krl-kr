import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { createToken, getSessionCookieOptions } from "@/lib/auth";
import { verifyTOTP } from "@/lib/totp";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, tempToken } = body;

    if (!token) {
      return NextResponse.json({ error: "인증 코드가 필요합니다." }, { status: 400 });
    }

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    let userId: string | null = null;

    // If tempToken provided, verify it and extract userId
    if (tempToken) {
      try {
        const { jwtVerify } = await import("jose");
        const secret = new TextEncoder().encode(
          process.env.JWT_SECRET ?? "krl-kr-dev-secret-change-in-production"
        );
        const { payload } = await jwtVerify(tempToken, secret, {
          issuer: "krl.kr",
          audience: "krl.kr",
        });
        userId = (payload as { userId?: string }).userId ?? null;
      } catch {
        return NextResponse.json({ error: "임시 토큰이 유효하지 않습니다." }, { status: 401 });
      }
    } else if (email) {
      // Fallback: look up by email
      const r = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email.toLowerCase()]);
      userId = r.rows[0]?.id ?? null;
    }

    if (!userId) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    const result = await pool.query(
      "SELECT id, email, name, plan, totp_secret, totp_enabled FROM users WHERE id = $1",
      [userId]
    );
    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    if (!user.totp_enabled || !user.totp_secret) {
      return NextResponse.json({ error: "2FA가 설정되지 않았습니다." }, { status: 400 });
    }

    const valid = verifyTOTP(user.totp_secret, String(token));
    if (!valid) {
      return NextResponse.json({ error: "잘못된 인증 코드입니다." }, { status: 401 });
    }

    // Issue full session token
    const sessionToken = await createToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });

    const cookieOptions = getSessionCookieOptions();
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
    });
    response.cookies.set({
      name: cookieOptions.name,
      value: sessionToken,
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      maxAge: cookieOptions.maxAge,
      path: cookieOptions.path,
    });

    return response;
  } catch (err) {
    console.error("[2fa/verify POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
