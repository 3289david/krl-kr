import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import crypto from "crypto";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const result = await pool.query("SELECT * FROM coupons WHERE user_id = $1 ORDER BY created_at DESC", [user.id]);
    return NextResponse.json({ coupons: result.rows });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { code, description = "", discount_type = "percent", discount_value = 0, max_uses = null, expires_at = null } = body;

    const finalCode = (code?.trim() || crypto.randomBytes(4).toString("hex").toUpperCase()).toUpperCase();

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const existing = await pool.query("SELECT id FROM coupons WHERE code = $1", [finalCode]);
    if (existing.rows[0]) return NextResponse.json({ error: "이미 존재하는 코드입니다." }, { status: 409 });

    const result = await pool.query(
      "INSERT INTO coupons (user_id, code, description, discount_type, discount_value, max_uses, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [user.id, finalCode, description, discount_type, discount_value, max_uses, expires_at, Date.now()]
    );
    return NextResponse.json({ coupon: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[coupon POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
