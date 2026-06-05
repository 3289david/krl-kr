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

// Link BMC email and auto-activate any pending plan
export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await ensureTable();
    const body = await request.json();
    const { bmc_email, bmc_order_id } = body;

    if (!bmc_email) return NextResponse.json({ error: "BMC 이메일을 입력해주세요." }, { status: 400 });

    const normalizedBmcEmail = bmc_email.toLowerCase().trim();
    const now = Date.now();

    // Check if there is a pending plan for this BMC email
    const pendingKey = `pending:${normalizedBmcEmail}`;
    const pendingRow = await pool.query(
      "SELECT plan, expires_at FROM user_plans WHERE user_id = $1 LIMIT 1",
      [pendingKey]
    );
    const pending = pendingRow.rows[0];

    // Upsert the user's plan row with their bmc_email
    const existing = await pool.query("SELECT id, plan FROM user_plans WHERE user_id = $1", [user.id]);

    if (pending) {
      // Activate the pending plan
      const activePlan = pending.plan;
      const expiresAt = pending.expires_at;
      if (existing.rows[0]) {
        await pool.query(
          "UPDATE user_plans SET bmc_email=$1, bmc_order_id=$2, plan=$3, verified_at=$4, expires_at=$5 WHERE user_id=$6",
          [normalizedBmcEmail, bmc_order_id ?? null, activePlan, now, expiresAt, user.id]
        );
      } else {
        await pool.query(
          "INSERT INTO user_plans (user_id, plan, bmc_email, bmc_order_id, verified_at, expires_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,$5)",
          [user.id, activePlan, normalizedBmcEmail, bmc_order_id ?? null, now, expiresAt]
        );
      }
      // Remove the pending placeholder
      await pool.query("DELETE FROM user_plans WHERE user_id = $1", [pendingKey]);
      console.log(`[plan] Activated pending ${activePlan} for ${user.id} via BMC email ${normalizedBmcEmail}`);
      return NextResponse.json({ success: true, activated: true, plan: activePlan });
    }

    // No pending plan — just save the bmc_email for future webhook matching
    if (existing.rows[0]) {
      await pool.query(
        "UPDATE user_plans SET bmc_email=$1, bmc_order_id=COALESCE($2, bmc_order_id) WHERE user_id=$3",
        [normalizedBmcEmail, bmc_order_id ?? null, user.id]
      );
    } else {
      await pool.query(
        "INSERT INTO user_plans (user_id, plan, bmc_email, bmc_order_id, created_at) VALUES ($1,'free',$2,$3,$4)",
        [user.id, normalizedBmcEmail, bmc_order_id ?? null, now]
      );
    }

    return NextResponse.json({ success: true, activated: false, message: "BMC 이메일이 저장되었습니다. 결제 후 자동으로 업그레이드됩니다." });
  } catch (err) {
    console.error("[plan POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
