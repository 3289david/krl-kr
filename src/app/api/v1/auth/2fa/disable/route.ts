import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { verifyTOTP } from "@/lib/totp";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { token } = body;
    if (!token) {
      return NextResponse.json({ error: "인증 코드가 필요합니다." }, { status: 400 });
    }

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const result = await pool.query(
      "SELECT totp_secret, totp_enabled FROM users WHERE id = $1",
      [user.id]
    );
    const row = result.rows[0];
    if (!row?.totp_enabled || !row?.totp_secret) {
      return NextResponse.json({ error: "2FA가 활성화되어 있지 않습니다." }, { status: 400 });
    }

    const valid = verifyTOTP(row.totp_secret, String(token));
    if (!valid) {
      return NextResponse.json({ error: "잘못된 인증 코드입니다." }, { status: 400 });
    }

    await pool.query(
      "UPDATE users SET totp_enabled = FALSE, totp_secret = NULL WHERE id = $1",
      [user.id]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[2fa/disable POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
