import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { checkStorageQuota, fmtBytes } from "@/lib/storage-quota";

export const runtime = "nodejs";

/** GET /api/v1/storage — unified storage usage for the logged-in user */
export async function GET(request: NextRequest) {
  const db = getDB(request);
  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  // Overall quota
  const quota = await checkStorageQuota(pool, user.id);

  // Per-feature breakdown
  const breakdown = await pool.query<{ feature: string; bytes: string; files: string }>(
    `SELECT feature, SUM(bytes)::BIGINT AS bytes, COUNT(*)::BIGINT AS files FROM (
       SELECT 'drive'::text AS feature, size AS bytes FROM drive_files WHERE user_id=$1 AND type='file'
       UNION ALL
       SELECT 'box'::text  AS feature, file_size AS bytes FROM box_items WHERE user_id=$1
     ) t GROUP BY feature ORDER BY bytes DESC`,
    [user.id]
  );

  return NextResponse.json({
    used: quota.used,
    max: quota.max,
    remaining: quota.remaining,
    plan: quota.plan,
    used_fmt: fmtBytes(quota.used),
    max_fmt: fmtBytes(quota.max),
    remaining_fmt: fmtBytes(quota.remaining),
    pct: quota.max > 0 ? Math.min(100, Math.round((quota.used / quota.max) * 100)) : 0,
    breakdown: breakdown.rows.map(r => ({
      feature: r.feature,
      bytes: Number(r.bytes),
      files: Number(r.files),
      fmt: fmtBytes(Number(r.bytes)),
    })),
  });
}
