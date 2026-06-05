/**
 * BuyMeACoffee Webhook Handler
 *
 * Setup:
 *   1. Go to https://www.buymeacoffee.com/dashboard/webhooks
 *   2. Add webhook URL: https://krl.kr/api/v1/webhook/bmc
 *   3. Copy the webhook secret → set BMC_WEBHOOK_SECRET env variable
 *
 * Events handled:
 *   - membership.started       → upgrade user plan
 *   - membership.updated       → update plan
 *   - membership.cancelled     → schedule downgrade on expiry
 *   - new_membership           → alias for started
 *   - membership_expired       → downgrade to free
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

export const runtime = "nodejs";

// Map BMC plan titles/amounts to KRL plan names
function resolvePlan(title: string, amount?: number): "pro" | "vip" | null {
  const t = (title ?? "").toLowerCase();
  if (t.includes("vip")) return "vip";
  if (t.includes("pro")) return "pro";
  // Fallback by price
  if (amount !== undefined) {
    if (amount >= 20) return "vip";
    if (amount >= 5) return "pro";
  }
  return null;
}

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    // BMC may send with or without prefix "sha256="
    const clean = signature.replace(/^sha256=/i, "");
    return expected === clean || createHmac("sha256", secret).update(rawBody).digest("base64") === signature;
  } catch {
    return false;
  }
}

async function upsertUserPlan(
  pool: import("pg").Pool,
  email: string,
  plan: "pro" | "vip" | "free",
  bmcData: Record<string, unknown>
) {
  // Find user by BMC email stored in user_plans, OR by user.email
  const userResult = await pool.query(
    `SELECT u.id FROM users u
     LEFT JOIN user_plans up ON up.user_id = u.id
     WHERE LOWER(u.email) = LOWER($1) OR LOWER(up.bmc_email) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  if (!userResult.rows[0]) {
    console.log(`[BMC webhook] No user found for email: ${email}`);
    return null;
  }

  const userId = userResult.rows[0].id;
  const now = Date.now();

  // Calculate expiry (1 month from now for active memberships, or immediate for cancelled)
  const expiresAt = plan !== "free" ? now + 32 * 24 * 60 * 60 * 1000 : null; // +32 days buffer

  await pool.query(`
    INSERT INTO user_plans (user_id, plan, bmc_email, verified_at, expires_at, created_at)
    VALUES ($1, $2, $3, $4, $5, $4)
    ON CONFLICT (user_id) DO UPDATE SET
      plan = $2,
      bmc_email = COALESCE($3, user_plans.bmc_email),
      verified_at = $4,
      expires_at = $5
  `, [userId, plan, email, now, expiresAt]);

  console.log(`[BMC webhook] User ${userId} (${email}) → plan: ${plan}`);
  return userId;
}

export async function POST(request: NextRequest) {
  const secret = process.env.BMC_WEBHOOK_SECRET;

  // Read raw body
  const rawBody = await request.text();

  // Verify signature if secret is set
  if (secret) {
    const sig = request.headers.get("x-bmc-signature") ?? request.headers.get("x-webhook-signature") ?? "";
    if (sig && !verifySignature(rawBody, sig, secret)) {
      console.warn("[BMC webhook] Signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = (payload.type ?? payload.event ?? "") as string;
  const data = (payload.data ?? payload) as Record<string, unknown>;

  const email = (
    data.supporter_email ??
    data.payer_email ??
    data.email ??
    payload.supporter_email
  ) as string | undefined;

  if (!email) {
    console.warn("[BMC webhook] No email in payload:", JSON.stringify(payload).slice(0, 300));
    return NextResponse.json({ received: true, skipped: "no_email" });
  }

  const planTitle = (data.support_plan_title ?? data.plan_title ?? data.tier_title ?? "") as string;
  const amount = parseFloat(String(data.support_plan_amount ?? data.amount ?? 0)) || 0;

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

  const lowerType = type.toLowerCase();

  if (
    lowerType.includes("start") ||
    lowerType.includes("new_membership") ||
    lowerType.includes("update") ||
    lowerType.includes("payment") ||
    lowerType.includes("active")
  ) {
    // Membership started or renewed
    const plan = resolvePlan(planTitle, amount);
    if (plan) {
      await upsertUserPlan(pool, email, plan, data);
      return NextResponse.json({ received: true, action: "upgraded", plan, email });
    } else {
      console.warn(`[BMC webhook] Unknown plan title: ${planTitle}, amount: ${amount}`);
      return NextResponse.json({ received: true, skipped: "unknown_plan" });
    }
  }

  if (
    lowerType.includes("cancel") ||
    lowerType.includes("expired") ||
    lowerType.includes("fail") ||
    lowerType.includes("refund")
  ) {
    // Membership cancelled/expired → downgrade
    await upsertUserPlan(pool, email, "free", data);
    return NextResponse.json({ received: true, action: "downgraded", email });
  }

  // One-time donations or other events — just log
  console.log(`[BMC webhook] Unhandled event type: ${type}`);
  return NextResponse.json({ received: true, skipped: type });
}

// Cron endpoint: check for expired memberships and downgrade
// Call this daily via cron: curl -X DELETE https://krl.kr/api/v1/webhook/bmc -H "Authorization: Bearer $CRON_SECRET"
export async function DELETE(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  const now = Date.now();

  const expired = await pool.query(`
    UPDATE user_plans SET plan = 'free'
    WHERE plan != 'free' AND expires_at IS NOT NULL AND expires_at < $1
    RETURNING user_id, bmc_email
  `, [now]);

  console.log(`[BMC cron] Downgraded ${expired.rowCount} expired memberships`);
  return NextResponse.json({ downgraded: expired.rows });
}
