import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/auth";
import { getDB } from "@/lib/env";
import crypto from "crypto";

export const runtime = "nodejs";

// Developer API — authenticate with X-API-Key header
async function getApiUser(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return { user: null, error: NextResponse.json({ error: "X-API-Key 헤더가 필요합니다." }, { status: 401 }) };

  const db = getDB(request);
  const user = await authenticateApiKey(db, apiKey);
  if (!user) return { user: null, error: NextResponse.json({ error: "유효하지 않은 API 키입니다." }, { status: 401 }) };
  return { user, error: null };
}

// POST /api/code?action=create|verify|redeem
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (!action) return NextResponse.json({ error: "action 파라미터가 필요합니다. (create|verify|redeem)" }, { status: 400 });

  const { user, error } = await getApiUser(request);
  if (error) return error;

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  const body = await request.json();

  if (action === "create") {
    const { type, ...opts } = body as { type: string; [k: string]: unknown };
    if (!type) return NextResponse.json({ error: "type이 필요합니다. (invite|coupon|license|otp|url)" }, { status: 400 });

    if (type === "otp") {
      const code = String(Math.floor(100000 + crypto.randomInt(900000))).padStart(6, "0");
      const ttl = Number(opts.ttl_minutes ?? 10);
      const expires_at = Date.now() + ttl * 60 * 1000;
      const r = await pool.query(
        "INSERT INTO one_time_codes (user_id, code, purpose, expires_at, used, created_at) VALUES ($1, $2, $3, $4, FALSE, $5) RETURNING *",
        [user.id, code, opts.purpose ?? "", expires_at, Date.now()]
      );
      return NextResponse.json({ success: true, code: r.rows[0] }, { status: 201 });
    }

    if (type === "url") {
      const { target_url, custom_code, title = "" } = opts as { target_url?: string; custom_code?: string; title?: string };
      if (!target_url) return NextResponse.json({ error: "target_url이 필요합니다." }, { status: 400 });
      try { new URL(target_url); } catch { return NextResponse.json({ error: "올바르지 않은 URL" }, { status: 400 }); }

      const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
      let code = custom_code?.trim() || Array.from(crypto.randomBytes(6)).map(b => chars[b % chars.length]).join("");
      const exists = await pool.query("SELECT id FROM short_urls WHERE code = $1", [code]);
      if (exists.rows[0]) return NextResponse.json({ error: "이미 존재하는 코드" }, { status: 409 });

      const r = await pool.query(
        "INSERT INTO short_urls (user_id, code, target_url, title, clicks, active, created_at) VALUES ($1, $2, $3, $4, 0, TRUE, $5) RETURNING *",
        [user.id, code, target_url, title, Date.now()]
      );
      return NextResponse.json({ success: true, url: r.rows[0], short_url: `https://go.krl.kr/${code}` }, { status: 201 });
    }

    return NextResponse.json({ error: "지원하지 않는 type입니다." }, { status: 400 });
  }

  if (action === "verify") {
    const { type, code, key } = body as { type: string; code?: string; key?: string };
    if (!type) return NextResponse.json({ error: "type이 필요합니다." }, { status: 400 });

    if (type === "otp") {
      if (!code) return NextResponse.json({ error: "code가 필요합니다." }, { status: 400 });
      const r = await pool.query("SELECT * FROM one_time_codes WHERE code = $1 AND used = FALSE", [code]);
      const otc = r.rows[0];
      if (!otc) return NextResponse.json({ valid: false, error: "유효하지 않은 OTP" });
      if (otc.expires_at && Number(otc.expires_at) < Date.now()) return NextResponse.json({ valid: false, error: "만료됨" });
      await pool.query("UPDATE one_time_codes SET used = TRUE, used_at = $1 WHERE id = $2", [Date.now(), otc.id]);
      return NextResponse.json({ valid: true, purpose: otc.purpose });
    }

    if (type === "coupon") {
      if (!code) return NextResponse.json({ error: "code가 필요합니다." }, { status: 400 });
      const r = await pool.query("SELECT * FROM coupons WHERE code = $1 AND active = TRUE", [code.toUpperCase()]);
      const c = r.rows[0];
      if (!c) return NextResponse.json({ valid: false, error: "유효하지 않은 쿠폰" });
      if (c.max_uses !== null && c.uses >= c.max_uses) return NextResponse.json({ valid: false, error: "사용 횟수 초과" });
      if (c.expires_at && Number(c.expires_at) < Date.now()) return NextResponse.json({ valid: false, error: "만료됨" });
      return NextResponse.json({ valid: true, discount_type: c.discount_type, discount_value: c.discount_value });
    }

    if (type === "license") {
      if (!key) return NextResponse.json({ error: "key가 필요합니다." }, { status: 400 });
      const r = await pool.query("SELECT * FROM license_keys WHERE key = $1 AND active = TRUE", [key.toUpperCase()]);
      const lk = r.rows[0];
      if (!lk) return NextResponse.json({ valid: false, error: "유효하지 않은 라이선스" });
      if (lk.expires_at && Number(lk.expires_at) < Date.now()) return NextResponse.json({ valid: false, error: "만료됨" });
      if (lk.max_activations !== null && lk.activations >= lk.max_activations) return NextResponse.json({ valid: false, error: "활성화 횟수 초과" });
      return NextResponse.json({ valid: true, label: lk.label, product: lk.product });
    }

    return NextResponse.json({ error: "지원하지 않는 type입니다." }, { status: 400 });
  }

  if (action === "redeem") {
    const { type, code } = body as { type: string; code: string };
    if (!type || !code) return NextResponse.json({ error: "type과 code가 필요합니다." }, { status: 400 });

    if (type === "coupon") {
      const r = await pool.query("SELECT * FROM coupons WHERE code = $1 AND active = TRUE", [code.toUpperCase()]);
      const c = r.rows[0];
      if (!c) return NextResponse.json({ success: false, error: "유효하지 않은 쿠폰" }, { status: 404 });
      if (c.max_uses !== null && c.uses >= c.max_uses) return NextResponse.json({ success: false, error: "사용 횟수 초과" }, { status: 400 });
      await pool.query("UPDATE coupons SET uses = uses + 1 WHERE id = $1", [c.id]);
      await pool.query("INSERT INTO coupon_redemptions (coupon_id, redeemed_by, redeemed_at) VALUES ($1, $2, $3)", [c.id, user.id, Date.now()]);
      return NextResponse.json({ success: true, discount_type: c.discount_type, discount_value: c.discount_value });
    }

    if (type === "invite") {
      const r = await pool.query("SELECT * FROM invite_codes WHERE code = $1 AND active = TRUE", [code.toUpperCase()]);
      const ic = r.rows[0];
      if (!ic) return NextResponse.json({ success: false, error: "유효하지 않은 초대 코드" }, { status: 404 });
      if (ic.max_uses !== null && ic.uses >= ic.max_uses) return NextResponse.json({ success: false, error: "사용 횟수 초과" }, { status: 400 });
      await pool.query("BEGIN");
      await pool.query("UPDATE invite_codes SET uses = uses + 1 WHERE id = $1", [ic.id]);
      await pool.query("INSERT INTO invite_uses (code_id, used_by_user_id, used_at) VALUES ($1, $2, $3)", [ic.id, user.id, Date.now()]);
      await pool.query("COMMIT");
      return NextResponse.json({ success: true, reward_type: ic.reward_type, reward_value: ic.reward_value });
    }

    return NextResponse.json({ error: "지원하지 않는 type입니다." }, { status: 400 });
  }

  return NextResponse.json({ error: "알 수 없는 action입니다." }, { status: 400 });
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    api: "KRL Codes Developer API",
    version: "1.0",
    endpoints: {
      "POST /api/code?action=create": "코드 생성 (type: otp|url)",
      "POST /api/code?action=verify": "코드 검증 (type: otp|coupon|license)",
      "POST /api/code?action=redeem": "코드 사용 처리 (type: coupon|invite)",
    },
    auth: "X-API-Key 헤더",
  });
}
