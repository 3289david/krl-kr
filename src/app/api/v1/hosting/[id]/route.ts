import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { deleteCloudflareDnsRecord } from "@/app/api/v1/subdomains/route";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

const HOSTING_DIR = "/var/www/krl-kr/hosting";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const result = await pool.query(
      "SELECT * FROM hosting_sites WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ error: "사이트를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ site: result.rows[0] });
  } catch (err) {
    console.error("[hosting/[id] GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const site = await pool.query(
      "SELECT * FROM hosting_sites WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    if (!site.rows[0]) {
      return NextResponse.json({ error: "사이트를 찾을 수 없습니다." }, { status: 404 });
    }

    const body = await request.json();
    const { name, framework } = body;
    const now = Date.now();

    const result = await pool.query(
      "UPDATE hosting_sites SET name = COALESCE($1, name), framework = COALESCE($2, framework), updated_at = $3 WHERE id = $4 AND user_id = $5 RETURNING *",
      [name ?? null, framework ?? null, now, id, user.id]
    );
    return NextResponse.json({ site: result.rows[0] });
  } catch (err) {
    console.error("[hosting/[id] PATCH]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const result = await pool.query(
      "DELETE FROM hosting_sites WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, user.id]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ error: "사이트를 찾을 수 없습니다." }, { status: 404 });
    }

    const site = result.rows[0];
    if (site.cf_dns_record_id) {
      await deleteCloudflareDnsRecord(site.cf_dns_record_id);
    }

    // Remove files
    const siteDir = path.join(HOSTING_DIR, String(id));
    if (fs.existsSync(siteDir)) {
      fs.rmSync(siteDir, { recursive: true, force: true });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[hosting/[id] DELETE]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
