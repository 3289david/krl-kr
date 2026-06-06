import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import crypto from "crypto";

export const runtime = "nodejs";

function genInviteCode(username: string): string {
  const prefix = (username ?? "KRL").toUpperCase().slice(0, 6).replace(/[^A-Z0-9]/g, "X");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const [codes, uses] = await Promise.all([
      pool.query("SELECT * FROM invite_codes WHERE user_id = $1 ORDER BY created_at DESC", [user.id]),
      pool.query("SELECT iu.*, ic.user_id as owner_id FROM invite_uses iu JOIN invite_codes ic ON iu.code_id = ic.id WHERE ic.user_id = $1 ORDER BY iu.used_at DESC", [user.id]),
    ]);
    return NextResponse.json({ codes: codes.rows, uses: uses.rows });
  } catch (err) {
    console.error("[invite GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { max_uses = null, reward_type = "none", reward_value = "", custom_code } = body;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    let code = custom_code?.trim().toUpperCase() || genInviteCode(user.username ?? user.email ?? "KRL");

    // Check uniqueness
    let attempts = 0;
    while (attempts < 5) {
      const exists = await pool.query("SELECT id FROM invite_codes WHERE code = $1", [code]);
      if (!exists.rows[0]) break;
      code = genInviteCode(user.username ?? user.email ?? "KRL");
      attempts++;
    }

    const result = await pool.query(
      "INSERT INTO invite_codes (user_id, code, max_uses, reward_type, reward_value, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [user.id, code, max_uses, reward_type, reward_value, Date.now()]
    );
    return NextResponse.json({ code: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[invite POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    await pool.query("DELETE FROM invite_codes WHERE id = $1 AND user_id = $2", [id, user.id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
