import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const session = await getSessionFromRequest(request);
    const check = await requireAdmin(db, session);
    if (!check.ok) return check.response;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_plans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        plan TEXT NOT NULL DEFAULT 'free',
        bmc_email TEXT,
        bmc_order_id TEXT,
        verified_at BIGINT,
        expires_at BIGINT,
        created_at BIGINT NOT NULL
      )
    `);

    const result = await pool.query(`
      SELECT up.*, u.email as user_email, u.name as user_name
      FROM user_plans up
      LEFT JOIN users u ON u.id = up.user_id
      ORDER BY up.created_at DESC
    `);

    return NextResponse.json({ rows: result.rows });
  } catch (err) {
    console.error("[admin/plans GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const session = await getSessionFromRequest(request);
    const check = await requireAdmin(db, session);
    if (!check.ok) return check.response;

    const body = await request.json();
    const { user_id, plan } = body;

    if (!user_id || !plan) return NextResponse.json({ error: "user_id와 plan이 필요합니다." }, { status: 400 });
    if (!["free", "pro", "vip"].includes(plan)) return NextResponse.json({ error: "잘못된 플랜입니다." }, { status: 400 });

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const now = Date.now();
    await pool.query(`
      INSERT INTO user_plans (user_id, plan, verified_at, created_at)
      VALUES ($1, $2, $3, $3)
      ON CONFLICT (user_id) DO UPDATE SET plan = $2, verified_at = $3
    `, [user_id, plan, now]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/plans POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
