/** PATCH /api/admin/reports/[id] — 신고 처리 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id } = await params;
  const { action, action_note } = await request.json();
  // action: 'dismiss' | 'block_user' | 'delete_resource' | 'community_ban' | 'warn'

  const validActions = ["dismiss", "block_user", "delete_resource", "community_ban", "warn"];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: "유효하지 않은 조치입니다." }, { status: 400 });
  }

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  // Get the report
  const reportRes = await pool.query(`SELECT * FROM user_reports WHERE id = $1`, [id]);
  if (reportRes.rows.length === 0) return NextResponse.json({ error: "신고를 찾을 수 없습니다." }, { status: 404 });
  const report = reportRes.rows[0];

  const now = Date.now();

  // Take action
  if (action === "block_user") {
    // Block the owner of the reported resource (target_id = user_id for user reports, otherwise look up)
    let userId = report.target_id;
    if (report.target_type !== "user") {
      // Look up the resource owner
      const tableMap: Record<string, { table: string; col: string }> = {
        link: { table: "links", col: "user_id" },
        subdomain: { table: "subdomains", col: "user_id" },
        email: { table: "email_aliases", col: "user_id" },
        post: { table: "community_posts", col: "user_id" },
      };
      const meta = tableMap[report.target_type];
      if (meta) {
        const ownerRes = await pool.query(`SELECT ${meta.col} FROM ${meta.table} WHERE id = $1 LIMIT 1`, [report.target_id]);
        if (ownerRes.rows[0]) userId = ownerRes.rows[0][meta.col];
      }
    }
    if (userId) {
      await pool.query(
        `INSERT INTO user_blocks (user_id, email, reason, blocked_by, blocked_at, block_type, appeal_allowed, auto_delete_at)
         SELECT $1, email, $2, $3, $4, 'full', 1, $5 FROM users WHERE id = $1
         ON CONFLICT (user_id) DO UPDATE SET reason = $2, blocked_by = $3, blocked_at = $4`,
        [userId, `신고 처리: ${report.reason?.slice(0, 100)}`, check.email, now, now + 30 * 86400000]
      );
      await pool.query(
        `INSERT INTO admin_log (admin_email, action, target_type, target_id, details, created_at) VALUES ($1, 'block_user', 'user', $2, $3, $4)`,
        [check.email, userId, `신고 기반 차단 - report#${id}`, now]
      );
    }
  } else if (action === "delete_resource") {
    const tableMap: Record<string, string> = {
      link: "links", subdomain: "subdomains", email: "email_aliases", post: "community_posts",
    };
    const tbl = tableMap[report.target_type];
    if (tbl) {
      // 서브도메인이면 Cloudflare DNS 레코드도 함께 제거
      if (report.target_type === "subdomain") {
        const subRow = await pool.query<{ cf_dns_record_id: string | null }>(
          `SELECT cf_dns_record_id FROM subdomains WHERE id = $1`, [report.target_id]
        );
        const cfRecordId = subRow.rows[0]?.cf_dns_record_id;
        if (cfRecordId) {
          const { deleteCloudflareDnsRecord } = await import("@/app/api/v1/subdomains/route");
          await deleteCloudflareDnsRecord(cfRecordId);
        }
      }
      await pool.query(`DELETE FROM ${tbl} WHERE id = $1`, [report.target_id]);
      await pool.query(
        `INSERT INTO admin_log (admin_email, action, target_type, target_id, details, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
        [check.email, `delete_${report.target_type}`, report.target_type, report.target_id, `신고 기반 삭제 - report#${id}`, now]
      );
    }
  } else if (action === "community_ban") {
    let userId = report.target_id;
    if (report.target_type === "post") {
      const ownerRes = await pool.query(`SELECT user_id FROM community_posts WHERE id = $1 LIMIT 1`, [report.target_id]);
      if (ownerRes.rows[0]) userId = ownerRes.rows[0].user_id;
    }
    if (userId) {
      const emailRes = await pool.query(`SELECT email FROM users WHERE id = $1 LIMIT 1`, [userId]);
      await pool.query(
        `INSERT INTO community_bans (user_id, email, reason, banned_by, banned_at, appeal_allowed)
         VALUES ($1, $2, $3, $4, $5, 1)
         ON CONFLICT DO NOTHING`,
        [userId, emailRes.rows[0]?.email ?? "", `신고 처리: ${report.reason?.slice(0, 100)}`, check.email, now]
      );
    }
  }

  // Update report status
  await pool.query(
    `UPDATE user_reports SET status = 'reviewed', action_taken = $1, reviewed_by = $2, reviewed_at = $3 WHERE id = $4`,
    [action_note ? `${action}: ${action_note}` : action, check.email, now, id]
  );

  return NextResponse.json({ ok: true });
}
