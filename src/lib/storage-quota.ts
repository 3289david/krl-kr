/**
 * Unified storage quota — Drive, Box, Notes, Docs, Wiki, Space, Git,
 * Vault, Tasks, Calendar, Whiteboard, Forms, Study, Blog all share one pool.
 * Hosting and CDN (cdn.krl.kr) are excluded.
 */
import type { Pool } from "pg";

export const PLAN_LIMITS: Record<string, number> = {
  free: 5 * 1024 ** 3,    // 5 GB
  pro: 20 * 1024 ** 3,    // 20 GB
  vip: 100 * 1024 ** 3,   // 100 GB
};

export interface StorageInfo {
  used: number;
  max: number;
  remaining: number;
  plan: string;
  ok: boolean;
}

export function getStorageLimit(
  plan: string,
  extraBytes: number = 0,
  overrideBytes?: number | null
): number {
  if (overrideBytes != null) return Number(overrideBytes);
  return (PLAN_LIMITS[plan] ?? PLAN_LIMITS.free) + Number(extraBytes);
}

/** Sum storage across ALL unified features for a user. */
export async function getStorageUsed(pool: Pool, userId: string): Promise<number> {
  const r = await pool.query<{ used: string }>(
    `SELECT COALESCE(SUM(bytes), 0)::BIGINT AS used FROM (
       SELECT size      AS bytes FROM drive_files WHERE user_id=$1 AND type='file'
       UNION ALL
       SELECT file_size AS bytes FROM box_items   WHERE user_id=$1
     ) t`,
    [userId]
  );
  return Number(r.rows[0].used);
}

export async function getUserPlan(pool: Pool, userId: string) {
  const r = await pool.query(
    "SELECT plan, extra_storage_bytes, storage_override_bytes FROM user_plans WHERE user_id=$1",
    [userId]
  );
  return r.rows[0] ?? { plan: "free", extra_storage_bytes: 0, storage_override_bytes: null };
}

/**
 * Check whether userId can store additionalBytes.
 * Returns full quota info regardless of ok/fail.
 */
export async function checkStorageQuota(
  pool: Pool,
  userId: string,
  additionalBytes: number = 0
): Promise<StorageInfo> {
  const [planRow, used] = await Promise.all([
    getUserPlan(pool, userId),
    getStorageUsed(pool, userId),
  ]);
  const max = getStorageLimit(planRow.plan, planRow.extra_storage_bytes, planRow.storage_override_bytes);
  return {
    used,
    max,
    remaining: max - used,
    plan: planRow.plan,
    ok: used + additionalBytes <= max,
  };
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
