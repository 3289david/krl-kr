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
    const { user_id, email, plan, extra_storage_gb, storage_override_gb, action } = body;

    if (!user_id && !email) {
      return NextResponse.json({ error: "user_id 또는 email이 필요합니다." }, { status: 400 });
    }

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    let resolvedUserId = user_id;
    if (!resolvedUserId && email) {
      const res = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [email]);
      if (!res.rows[0]) return NextResponse.json({ error: "해당 이메일의 유저를 찾을 수 없습니다." }, { status: 404 });
      resolvedUserId = res.rows[0].id;
    }

    const now = Date.now();

    // Storage reset action
    if (action === "reset_extra_storage") {
      await pool.query(`
        UPDATE user_plans SET extra_storage_bytes = 0 WHERE user_id = $1
      `, [resolvedUserId]);
      return NextResponse.json({ success: true, action: "reset_extra_storage" });
    }

    // Plan change
    if (plan) {
      if (!["free", "pro", "vip"].includes(plan)) {
        return NextResponse.json({ error: "잘못된 플랜입니다." }, { status: 400 });
      }
      const expiresAt = plan !== "free" ? now + 33 * 24 * 60 * 60 * 1000 : null;
      await pool.query(`
        INSERT INTO user_plans (user_id, plan, bmc_email, verified_at, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $4)
        ON CONFLICT (user_id) DO UPDATE SET plan=$2, bmc_email=COALESCE($3, user_plans.bmc_email), verified_at=$4, expires_at=$5
      `, [resolvedUserId, plan, email ?? null, now, expiresAt]);
    }

    // Extra storage add
    if (extra_storage_gb !== undefined) {
      const bytes = Math.max(0, Number(extra_storage_gb)) * 1024 * 1024 * 1024;
      await pool.query(`
        INSERT INTO user_plans (user_id, plan, extra_storage_bytes, created_at)
        VALUES ($1, 'free', $2, $3)
        ON CONFLICT (user_id) DO UPDATE SET extra_storage_bytes = user_plans.extra_storage_bytes + $2
      `, [resolvedUserId, bytes, now]);
    }

    // Storage override (admin-set hard limit)
    if (storage_override_gb !== undefined) {
      const overrideBytes = storage_override_gb === null || storage_override_gb === ""
        ? null
        : Number(storage_override_gb) * 1024 * 1024 * 1024;
      await pool.query(`
        INSERT INTO user_plans (user_id, plan, storage_override_bytes, created_at)
        VALUES ($1, 'free', $2, $3)
        ON CONFLICT (user_id) DO UPDATE SET storage_override_bytes = $2
      `, [resolvedUserId, overrideBytes, now]);
    }

    return NextResponse.json({ success: true, user_id: resolvedUserId });
  } catch (err) {
    console.error("[admin/plans POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
