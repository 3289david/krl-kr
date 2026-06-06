import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import crypto from "crypto";

export const runtime = "nodejs";

function genShortCode(length = 6): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const result = await pool.query("SELECT * FROM short_urls WHERE user_id = $1 ORDER BY created_at DESC", [user.id]);
    return NextResponse.json({ urls: result.rows });
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
    const { target_url, custom_code, title = "" } = body;
    if (!target_url?.trim()) return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });

    // Validate URL
    try { new URL(target_url); } catch { return NextResponse.json({ error: "올바르지 않은 URL입니다." }, { status: 400 }); }

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    let code = custom_code?.trim() || genShortCode();

    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 10) {
      const exists = await pool.query("SELECT id FROM short_urls WHERE code = $1", [code]);
      if (!exists.rows[0]) break;
      if (custom_code) return NextResponse.json({ error: "이미 사용 중인 코드입니다." }, { status: 409 });
      code = genShortCode();
      attempts++;
    }

    const result = await pool.query(
      "INSERT INTO short_urls (user_id, code, target_url, title, clicks, active, created_at) VALUES ($1, $2, $3, $4, 0, TRUE, $5) RETURNING *",
      [user.id, code, target_url.trim(), title, Date.now()]
    );
    return NextResponse.json({ url: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[url POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
