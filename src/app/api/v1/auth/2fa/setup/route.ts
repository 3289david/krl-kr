import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { generateSecret, getTOTP, verifyTOTP, getQRUri } from "@/lib/totp";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const secret = generateSecret();
    const uri = getQRUri(secret, user.email);

    // Save to DB (not enabled yet)
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    await pool.query(
      "UPDATE users SET totp_secret = $1 WHERE id = $2",
      [secret, user.id]
    );

    let qr_data_url = "";
    try {
      const QRCode = await import("qrcode");
      qr_data_url = await QRCode.default.toDataURL(uri);
    } catch {
      qr_data_url = "";
    }

    return NextResponse.json({ secret, qr_uri: uri, qr_data_url });
  } catch (err) {
    console.error("[2fa/setup GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { token } = body;
    if (!token) {
      return NextResponse.json({ error: "토큰이 필요합니다." }, { status: 400 });
    }

    // Get stored secret
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const result = await pool.query(
      "SELECT totp_secret FROM users WHERE id = $1",
      [user.id]
    );
    const row = result.rows[0];
    if (!row?.totp_secret) {
      return NextResponse.json({ error: "먼저 설정을 시작해주세요." }, { status: 400 });
    }

    const valid = verifyTOTP(row.totp_secret, String(token));
    if (!valid) {
      return NextResponse.json({ error: "잘못된 인증 코드입니다." }, { status: 400 });
    }

    await pool.query(
      "UPDATE users SET totp_enabled = TRUE WHERE id = $1",
      [user.id]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[2fa/setup POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
