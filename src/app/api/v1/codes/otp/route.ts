import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import crypto from "crypto";

export const runtime = "nodejs";

function genOTP(): string {
  return String(Math.floor(100000 + crypto.randomInt(900000))).padStart(6, "0");
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const result = await pool.query("SELECT * FROM one_time_codes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100", [user.id]);
    return NextResponse.json({ codes: result.rows });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { purpose } = body as { purpose?: string };
    const action = new URL(request.url).searchParams.get("action") ?? "create";

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    if (action === "verify") {
      const { code, id } = body as { code: string; id?: string };
      if (!code) return NextResponse.json({ error: "코드가 필요합니다." }, { status: 400 });

      let query: string;
      let values: unknown[];
      if (id) {
        query = "SELECT * FROM one_time_codes WHERE id = $1 AND code = $2 AND used = FALSE";
        values = [id, code.trim()];
      } else {
        query = "SELECT * FROM one_time_codes WHERE code = $1 AND used = FALSE";
        values = [code.trim()];
      }

      const result = await pool.query(query, values);
      const otc = result.rows[0];
      if (!otc) return NextResponse.json({ valid: false, error: "유효하지 않은 코드입니다." }, { status: 404 });
      if (otc.expires_at && Number(otc.expires_at) < Date.now()) return NextResponse.json({ valid: false, error: "만료된 코드입니다." }, { status: 400 });

      await pool.query("UPDATE one_time_codes SET used = TRUE, used_at = $1 WHERE id = $2", [Date.now(), otc.id]);
      return NextResponse.json({ valid: true, purpose: otc.purpose });
    }

    // Default: create new OTP — requires auth for tracking
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { ttl_minutes = 10 } = body as { ttl_minutes?: number };
    const code = genOTP();
    const expires_at = Date.now() + ttl_minutes * 60 * 1000;

    const result = await pool.query(
      "INSERT INTO one_time_codes (user_id, code, purpose, expires_at, used, created_at) VALUES ($1, $2, $3, $4, FALSE, $5) RETURNING *",
      [user.id, code, purpose ?? "", expires_at, Date.now()]
    );
    return NextResponse.json({ otp: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[otp POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
