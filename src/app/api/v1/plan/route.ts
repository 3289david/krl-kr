import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

const PLANS = {
  free: {
    name: "Free",
    drive_gb: 5,
    hosting_sites: 1,
    hosting_storage_mb: 500,
    ai_model: "claude-haiku-4-5-20251001",
    ai_image: false,
    price_krw: 0,
  },
  pro: {
    name: "Pro",
    drive_gb: 20,
    hosting_sites: 5,
    hosting_storage_mb: 3072,
    ai_model: "claude-sonnet-4-6",
    ai_image: true,
    ai_image_monthly: 200,
    price_krw: 9900,
    bmc_tier: "pro",
  },
  vip: {
    name: "VIP",
    drive_gb: 100,
    hosting_sites: 999,
    hosting_storage_mb: 10240,
    ai_model: "claude-opus-4-7",
    ai_image: true,
    ai_image_monthly: 1000,
    price_krw: 29900,
    bmc_tier: "vip",
  },
};

async function ensureTable() {
  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_plans (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      plan TEXT NOT NULL DEFAULT 'free',
      bmc_email TEXT,
      bmc_order_id TEXT,
      verified_at BIGINT,
      expires_at BIGINT,
      created_at BIGINT NOT NULL
    )
  `);
  return pool;
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await ensureTable();
    const result = await pool.query("SELECT * FROM user_plans WHERE user_id = $1", [user.id]);
    const row = result.rows[0];
    const plan = (row?.plan ?? "free") as keyof typeof PLANS;
    const details = PLANS[plan] ?? PLANS.free;

    return NextResponse.json({ plan, details, row: row ?? null, plans: PLANS });
  } catch (err) {
    console.error("[plan GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// Submit BMC verification request
export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await ensureTable();
    const body = await request.json();
    const { bmc_email, bmc_order_id } = body;

    if (!bmc_email) return NextResponse.json({ error: "BMC 이메일을 입력해주세요." }, { status: 400 });

    const now = Date.now();
    // Store verification request — admin manually verifies and upgrades
    const existing = await pool.query("SELECT id FROM user_plans WHERE user_id = $1", [user.id]);
    if (existing.rows[0]) {
      await pool.query(
        "UPDATE user_plans SET bmc_email = $1, bmc_order_id = $2 WHERE user_id = $3",
        [bmc_email, bmc_order_id ?? null, user.id]
      );
    } else {
      await pool.query(
        "INSERT INTO user_plans (user_id, plan, bmc_email, bmc_order_id, created_at) VALUES ($1, 'free', $2, $3, $4)",
        [user.id, bmc_email, bmc_order_id ?? null, now]
      );
    }

    return NextResponse.json({ success: true, message: "인증 요청이 제출되었습니다. 관리자 확인 후 업그레이드됩니다." });
  } catch (err) {
    console.error("[plan POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
