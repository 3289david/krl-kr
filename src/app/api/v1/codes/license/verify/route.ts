import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Public endpoint — verify and activate a license key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, machine_id } = body as { key: string; machine_id?: string };
    if (!key?.trim()) return NextResponse.json({ error: "키가 필요합니다." }, { status: 400 });

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const result = await pool.query("SELECT * FROM license_keys WHERE key = $1 AND active = TRUE", [key.trim().toUpperCase()]);
    const lk = result.rows[0];
    if (!lk) return NextResponse.json({ valid: false, error: "유효하지 않은 라이선스 키입니다." }, { status: 404 });
    if (lk.expires_at && Number(lk.expires_at) < Date.now()) return NextResponse.json({ valid: false, error: "만료된 라이선스입니다." }, { status: 400 });
    if (lk.max_activations !== null && lk.activations >= lk.max_activations) {
      return NextResponse.json({ valid: false, error: "최대 활성화 횟수를 초과했습니다." }, { status: 400 });
    }

    await pool.query("UPDATE license_keys SET activations = activations + 1 WHERE id = $1", [lk.id]);

    return NextResponse.json({
      valid: true,
      label: lk.label,
      product: lk.product,
      activations: lk.activations + 1,
      max_activations: lk.max_activations,
    });
  } catch (err) {
    console.error("[license/verify POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key) return NextResponse.json({ error: "키가 필요합니다." }, { status: 400 });

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  const result = await pool.query(
    "SELECT key, label, product, activations, max_activations, expires_at, active FROM license_keys WHERE key = $1",
    [key.trim().toUpperCase()]
  );
  const lk = result.rows[0];
  if (!lk || !lk.active) return NextResponse.json({ valid: false, error: "유효하지 않은 키" });
  if (lk.expires_at && Number(lk.expires_at) < Date.now()) return NextResponse.json({ valid: false, error: "만료됨" });
  if (lk.max_activations !== null && lk.activations >= lk.max_activations) return NextResponse.json({ valid: false, error: "활성화 횟수 초과" });
  return NextResponse.json({ valid: true, label: lk.label, product: lk.product, activations: lk.activations, max_activations: lk.max_activations });
}
