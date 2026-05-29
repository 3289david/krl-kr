/** GET /api/admin/resources?q=...&type=link|subdomain|email */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const type = searchParams.get("type") ?? "all";

  if (!q || q.length < 1) {
    return NextResponse.json({ links: [], subdomains: [], emails: [] });
  }

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  const like = `%${q}%`;

  const [links, subdomains, emails] = await Promise.all([
    (type === "all" || type === "link") ? pool.query(
      `SELECT l.id, l.slug, l.original_url, l.title, l.click_count, l.is_active, l.created_at,
              u.id as user_id, u.email as user_email, u.name as user_name
       FROM links l JOIN users u ON u.id = l.user_id
       WHERE l.slug ILIKE $1 OR l.original_url ILIKE $1 OR l.title ILIKE $1
       ORDER BY l.created_at DESC LIMIT 30`,
      [like]
    ) : { rows: [] },

    (type === "all" || type === "subdomain") ? pool.query(
      `SELECT s.id, s.subdomain, s.type, s.target, s.is_active, s.created_at,
              u.id as user_id, u.email as user_email, u.name as user_name
       FROM subdomains s JOIN users u ON u.id = s.user_id
       WHERE s.subdomain ILIKE $1 OR s.target ILIKE $1
       ORDER BY s.created_at DESC LIMIT 30`,
      [like]
    ) : { rows: [] },

    (type === "all" || type === "email") ? pool.query(
      `SELECT e.id, e.alias, e.forward_to, e.is_active, e.created_at,
              u.id as user_id, u.email as user_email, u.name as user_name
       FROM email_aliases e JOIN users u ON u.id = e.user_id
       WHERE e.alias ILIKE $1 OR e.forward_to ILIKE $1
       ORDER BY e.created_at DESC LIMIT 30`,
      [like]
    ) : { rows: [] },
  ]);

  return NextResponse.json({
    links: links.rows,
    subdomains: subdomains.rows,
    emails: emails.rows,
  });
}

/** DELETE /api/admin/resources — 리소스 삭제 */
export async function DELETE(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { type, id } = await request.json();
  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  const tableMap: Record<string, string> = {
    link: "links",
    subdomain: "subdomains",
    email: "email_aliases",
  };
  const tbl = tableMap[type];
  if (!tbl) return NextResponse.json({ error: "유효하지 않은 유형" }, { status: 400 });

  // 서브도메인 삭제 시 Cloudflare DNS 레코드도 함께 제거
  if (type === "subdomain") {
    const subRow = await pool.query<{ cf_dns_record_id: string | null }>(
      `SELECT cf_dns_record_id FROM subdomains WHERE id = $1`, [id]
    );
    const cfRecordId = subRow.rows[0]?.cf_dns_record_id;
    if (cfRecordId) {
      const { deleteCloudflareDnsRecord } = await import("@/app/api/v1/subdomains/route");
      await deleteCloudflareDnsRecord(cfRecordId);
    }
  }

  await pool.query(`DELETE FROM ${tbl} WHERE id = $1`, [id]);
  await pool.query(
    `INSERT INTO admin_log (admin_email, action, target_type, target_id, details, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
    [check.email, `delete_${type}`, type, id, `관리 탭에서 직접 삭제`, Date.now()]
  );

  return NextResponse.json({ ok: true });
}

/** PATCH /api/admin/resources — 리소스 활성/비활성 토글 */
export async function PATCH(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { type, id, is_active } = await request.json();
  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  const tableMap: Record<string, string> = {
    link: "links",
    subdomain: "subdomains",
    email: "email_aliases",
  };
  const tbl = tableMap[type];
  if (!tbl) return NextResponse.json({ error: "유효하지 않은 유형" }, { status: 400 });

  await pool.query(`UPDATE ${tbl} SET is_active = $1 WHERE id = $2`, [is_active ? 1 : 0, id]);
  return NextResponse.json({ ok: true });
}
