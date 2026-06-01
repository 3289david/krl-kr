import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

async function ensureTable() {
  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS header_config (
      id INTEGER PRIMARY KEY,
      config_json TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `);
  return pool;
}

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  try {
    const pool = await ensureTable();
    const result = await pool.query("SELECT config_json FROM header_config WHERE id = 1");
    if (!result.rows[0]) return NextResponse.json({ config: null });
    return NextResponse.json({ config: JSON.parse(result.rows[0].config_json) });
  } catch {
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { config } = await request.json();
  if (!config || typeof config !== "object") {
    return NextResponse.json({ error: "유효하지 않은 설정입니다." }, { status: 400 });
  }

  try {
    const pool = await ensureTable();
    await pool.query(
      `INSERT INTO header_config (id, config_json, updated_by, updated_at)
       VALUES (1, $1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET
         config_json = EXCLUDED.config_json,
         updated_by = EXCLUDED.updated_by,
         updated_at = EXCLUDED.updated_at`,
      [JSON.stringify(config), check.email, Date.now()]
    );
    await pool.query(
      `INSERT INTO admin_log (admin_email, action, target_type, target_id, details, created_at)
       VALUES ($1, 'update_header_config', 'system', 'header', '헤더 설정 업데이트', $2)`,
      [check.email, Date.now()]
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Header config save error:", e);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
