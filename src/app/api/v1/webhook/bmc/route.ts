/**
 * BuyMeACoffee Webhook Handler
 *
 * Setup:
 *   1. https://www.buymeacoffee.com/dashboard/webhooks
 *   2. Webhook URL: https://krl.kr/api/v1/webhook/bmc
 *   3. Copy webhook secret → BMC_WEBHOOK_SECRET env variable
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

export const runtime = "nodejs";

function resolvePlan(title: string, amount: number, pspId?: string, durationType?: string): "pro" | "vip" | null {
  // GIVE_AWAY / lifetime giveaway memberships are still valid — treat as pro
  if (
    pspId === "GIVE_AWAY" ||
    String(durationType ?? "").toLowerCase().includes("giveaway") ||
    String(durationType ?? "").toLowerCase().includes("lifetime")
  ) return "pro";

  const t = (title ?? "").toLowerCase();
  if (t.includes("vip") || t.includes("ultra") || t.includes("premium")) return "vip";
  if (t.includes("pro") || t.includes("member") || t.includes("supporter")) return "pro";
  if (amount >= 15) return "vip";
  if (amount >= 1) return "pro";
  return null;
}

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  if (!signature) return true; // no sig = skip check (for testing)
  try {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const clean = signature.replace(/^sha256=/i, "");
    return expected === clean || createHmac("sha256", secret).update(rawBody).digest("base64") === signature;
  } catch {
    return false;
  }
}

async function getPool() {
  const { getPool: _getPool } = await import("@/lib/db/postgres");
  const pool = _getPool();
  // Ensure user_plans table with TEXT user_id
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

async function upsertUserPlan(
  pool: import("pg").Pool,
  email: string,
  plan: "pro" | "vip" | "free",
  orderId?: string
) {
  // Find user by their registered email only
  const userResult = await pool.query(
    `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email]
  );

  if (!userResult.rows[0]) {
    console.log(`[BMC] No user found for ${email} — storing pending`);
    // Store pending: create row with email only so it activates when they register
    await pool.query(`
      INSERT INTO user_plans (user_id, plan, bmc_email, verified_at, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $4)
      ON CONFLICT (user_id) DO UPDATE SET plan=$2, bmc_email=$3, verified_at=$4, expires_at=$5
    `, [`pending:${email.toLowerCase()}`, plan, email.toLowerCase(), Date.now(),
      plan !== "free" ? Date.now() + 33 * 24 * 60 * 60 * 1000 : null]);
    return null;
  }

  const userId = userResult.rows[0].id;
  const now = Date.now();
  const expiresAt = plan !== "free" ? now + 33 * 24 * 60 * 60 * 1000 : null;

  await pool.query(`
    INSERT INTO user_plans (user_id, plan, bmc_email, bmc_order_id, verified_at, expires_at, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $5)
    ON CONFLICT (user_id) DO UPDATE SET
      plan = $2,
      bmc_email = COALESCE($3, user_plans.bmc_email),
      bmc_order_id = COALESCE($4, user_plans.bmc_order_id),
      verified_at = $5,
      expires_at = $6
  `, [userId, plan, email.toLowerCase(), orderId ?? null, now, expiresAt]);

  console.log(`[BMC] User ${userId} (${email}) → ${plan}, expires: ${expiresAt}`);
  return userId;
}

export async function POST(request: NextRequest) {
  const secret = process.env.BMC_WEBHOOK_SECRET;
  const rawBody = await request.text();

  // Log every incoming webhook for debugging
  console.log(`[BMC webhook] headers: ${JSON.stringify({
    sig: request.headers.get("x-bmc-signature") ?? request.headers.get("x-webhook-signature") ?? "none",
    type: request.headers.get("content-type"),
  })}`);
  console.log(`[BMC webhook] body: ${rawBody.slice(0, 500)}`);

  if (secret) {
    const sig = request.headers.get("x-bmc-signature") ?? request.headers.get("x-webhook-signature") ?? "";
    if (sig && !verifySignature(rawBody, sig, secret)) {
      console.warn("[BMC] Signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // BMC sends various formats — handle all
  const type = String(payload.type ?? payload.event ?? "unknown").toLowerCase();
  const data = (payload.data ?? payload) as Record<string, unknown>;

  // Extract email from all possible fields
  const email = String(
    data.supporter_email ?? data.payer_email ?? data.email ??
    payload.supporter_email ?? payload.email ?? ""
  ).toLowerCase().trim();

  if (!email || !email.includes("@")) {
    console.warn("[BMC] No valid email in payload");
    return NextResponse.json({ received: true, skipped: "no_email" });
  }

  // Extract plan info
  const planTitle = String(data.support_plan_title ?? data.plan_title ?? data.tier_title ?? data.membership_name ?? "");
  const amountRaw = data.support_plan_amount ?? data.amount ?? data.price ?? data.supporter_membership_amount ?? 0;
  const amount = parseFloat(String(amountRaw)) || 0;
  const orderId = String(data.support_id ?? data.order_id ?? data.membership_id ?? "");
  const pspId = String(data.psp_id ?? "");
  const durationType = String(data.duration_type ?? "");

  const pool = await getPool();

  // Determine action based on event type
  const isCancellation = type.includes("cancel") || type.includes("expired") || type.includes("fail") || type.includes("refund");
  const isActive = type.includes("start") || type.includes("new") || type.includes("update") ||
    type.includes("payment") || type.includes("active") || type.includes("renew") || type.includes("member");

  if (isCancellation) {
    await upsertUserPlan(pool, email, "free", orderId);
    return NextResponse.json({ received: true, action: "downgraded", email });
  }

  if (isActive || type === "unknown") {
    const plan = resolvePlan(planTitle, amount, pspId, durationType);
    if (plan) {
      await upsertUserPlan(pool, email, plan, orderId);
      console.log(`[BMC] Upgraded ${email} → ${plan} (psp=${pspId} dur=${durationType})`);
      return NextResponse.json({ received: true, action: "upgraded", plan, email });
    } else if (type !== "unknown") {
      console.warn(`[BMC] Cannot resolve plan — title="${planTitle}" amount=${amount} psp=${pspId}`);
    }
  }

  console.log(`[BMC] Unhandled event: type="${type}"`);
  return NextResponse.json({ received: true, skipped: type });
}

// Cron: expire stale plans daily
export async function DELETE(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const pool = await getPool();
  const now = Date.now();

  const expired = await pool.query(`
    UPDATE user_plans SET plan = 'free'
    WHERE plan != 'free' AND expires_at IS NOT NULL AND expires_at < $1
    RETURNING user_id, bmc_email
  `, [now]);

  // Also activate pending plans for users who have since registered
  const pending = await pool.query(`
    SELECT up.user_id as pending_key, up.plan, up.bmc_email, up.expires_at, u.id as real_user_id
    FROM user_plans up
    JOIN users u ON LOWER(u.email) = LOWER(up.bmc_email)
    WHERE up.user_id LIKE 'pending:%'
  `);

  for (const row of pending.rows) {
    await pool.query(`
      INSERT INTO user_plans (user_id, plan, bmc_email, verified_at, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $4)
      ON CONFLICT (user_id) DO UPDATE SET plan=$2, bmc_email=$3, expires_at=$5
    `, [row.real_user_id, row.plan, row.bmc_email, Date.now(), row.expires_at]);
    await pool.query(`DELETE FROM user_plans WHERE user_id = $1`, [row.pending_key]);
    console.log(`[BMC cron] Activated pending plan for ${row.bmc_email} → ${row.plan}`);
  }

  console.log(`[BMC cron] Expired: ${expired.rowCount}, Activated pending: ${pending.rowCount}`);
  return NextResponse.json({ downgraded: expired.rows, activated: pending.rows.length });
}
