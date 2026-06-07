import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Public endpoint — verify a coupon code before checkout
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.json({ error: "코드가 필요합니다." }, { status: 400 });

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  const result = await pool.query(
    "SELECT id, code, description, discount_type, discount_value, max_uses, uses, expires_at, active FROM coupons WHERE code = $1",
    [code.trim().toUpperCase()]
  );
  const c = result.rows[0];
  if (!c || !c.active) return NextResponse.json({ valid: false, error: "유효하지 않은 쿠폰입니다." });
  if (c.max_uses !== null && c.uses >= c.max_uses) return NextResponse.json({ valid: false, error: "사용 횟수가 초과된 쿠폰입니다." });
  if (c.expires_at && Number(c.expires_at) < Date.now()) return NextResponse.json({ valid: false, error: "만료된 쿠폰입니다." });

  return NextResponse.json({
    valid: true,
    code: c.code,
    description: c.description,
    discount_type: c.discount_type,
    discount_value: c.discount_value,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, user_id, email, order_amount } = body as { code: string; user_id?: number; email?: string; order_amount?: number };
    if (!code?.trim()) return NextResponse.json({ error: "코드가 필요합니다." }, { status: 400 });

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const result = await pool.query("SELECT * FROM coupons WHERE code = $1 AND active = TRUE", [code.trim().toUpperCase()]);
    const c = result.rows[0];
    if (!c) return NextResponse.json({ error: "유효하지 않은 쿠폰입니다." }, { status: 404 });
    if (c.max_uses !== null && c.uses >= c.max_uses) return NextResponse.json({ error: "사용 횟수 초과 쿠폰입니다." }, { status: 400 });
    if (c.expires_at && Number(c.expires_at) < Date.now()) return NextResponse.json({ error: "만료된 쿠폰입니다." }, { status: 400 });

    // Record redemption and increment uses
    await pool.query("BEGIN");
    await pool.query("UPDATE coupons SET uses = uses + 1 WHERE id = $1", [c.id]);
    await pool.query(
      "INSERT INTO coupon_redemptions (coupon_id, redeemed_by, redeemed_at) VALUES ($1, $2, $3)",
      [c.id, user_id ?? email ?? "", Date.now()]
    );
    await pool.query("COMMIT");

    const discountAmount = c.discount_type === "percent"
      ? (order_amount ? Math.floor((order_amount * c.discount_value) / 100) : null)
      : c.discount_value;

    return NextResponse.json({ success: true, discount_type: c.discount_type, discount_value: c.discount_value, discount_amount: discountAmount });
  } catch (err) {
    console.error("[coupon/verify POST]", err);
    const { getPool } = await import("@/lib/db/postgres").catch(() => ({ getPool: () => null }));
    try { (getPool() as any)?.query("ROLLBACK"); } catch {}
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
