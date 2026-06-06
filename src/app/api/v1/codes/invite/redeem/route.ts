import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

// Public endpoint - no auth required (called during signup flow)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, user_id, email } = body as { code: string; user_id?: number; email?: string };
    if (!code?.trim()) return NextResponse.json({ error: "코드가 필요합니다." }, { status: 400 });

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const found = await pool.query(
      "SELECT * FROM invite_codes WHERE code = $1 AND active = TRUE",
      [code.trim().toUpperCase()]
    );
    const ic = found.rows[0];
    if (!ic) return NextResponse.json({ error: "유효하지 않은 초대 코드입니다." }, { status: 404 });
    if (ic.max_uses !== null && ic.uses >= ic.max_uses) {
      return NextResponse.json({ error: "이미 최대 사용 횟수에 도달한 코드입니다." }, { status: 400 });
    }

    // Check if this user already used this code
    if (user_id) {
      const already = await pool.query("SELECT id FROM invite_uses WHERE code_id = $1 AND used_by_user_id = $2", [ic.id, user_id]);
      if (already.rows[0]) return NextResponse.json({ error: "이미 사용한 코드입니다." }, { status: 400 });
    }

    await pool.query("BEGIN");
    await pool.query("UPDATE invite_codes SET uses = uses + 1 WHERE id = $1", [ic.id]);
    await pool.query(
      "INSERT INTO invite_uses (code_id, used_by_user_id, used_by_email, used_at) VALUES ($1, $2, $3, $4)",
      [ic.id, user_id ?? null, email ?? "", Date.now()]
    );
    await pool.query("COMMIT");

    return NextResponse.json({
      success: true,
      reward_type: ic.reward_type,
      reward_value: ic.reward_value,
      message: ic.reward_type !== "none" ? `보상 지급: ${ic.reward_type} (${ic.reward_value})` : "초대 코드가 적용되었습니다.",
    });
  } catch (err) {
    console.error("[invite/redeem POST]", err);
    const { getPool } = await import("@/lib/db/postgres").catch(() => ({ getPool: () => null }));
    try { (getPool() as any)?.query("ROLLBACK"); } catch {}
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.json({ error: "코드가 필요합니다." }, { status: 400 });

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  const found = await pool.query(
    "SELECT id, code, uses, max_uses, reward_type, reward_value, active FROM invite_codes WHERE code = $1",
    [code.trim().toUpperCase()]
  );
  const ic = found.rows[0];
  if (!ic || !ic.active) return NextResponse.json({ valid: false, error: "유효하지 않은 코드" });
  if (ic.max_uses !== null && ic.uses >= ic.max_uses) return NextResponse.json({ valid: false, error: "사용 횟수 초과" });
  return NextResponse.json({ valid: true, reward_type: ic.reward_type, reward_value: ic.reward_value });
}
