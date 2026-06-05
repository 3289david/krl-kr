import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { createCloudflareDnsRecord, deleteCloudflareDnsRecord } from "@/app/api/v1/subdomains/route";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

const HOSTING_DIR = "/var/www/krl-kr/hosting";

const PLAN_LIMITS = {
  free: { sites: 1, storageMB: 500 },
  pro:  { sites: 5, storageMB: 3072 },
  vip:  { sites: 999, storageMB: 10240 },
};

async function ensureTables() {
  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hosting_sites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      subdomain TEXT NOT NULL UNIQUE,
      framework TEXT DEFAULT 'static',
      status TEXT DEFAULT 'active',
      storage_used BIGINT DEFAULT 0,
      visit_count BIGINT DEFAULT 0,
      cf_dns_record_id TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT
    )
  `);
  // Migrate: add visit_count if table existed before this column was added
  await pool.query(`ALTER TABLE hosting_sites ADD COLUMN IF NOT EXISTS visit_count BIGINT DEFAULT 0`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_plans (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE,
      plan TEXT NOT NULL DEFAULT 'free',
      bmc_email TEXT,
      bmc_order_id TEXT,
      verified_at BIGINT,
      expires_at BIGINT,
      created_at BIGINT NOT NULL
    )
  `);
  return pool;
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await ensureTables();
    const result = await pool.query(
      "SELECT * FROM hosting_sites WHERE user_id = $1 ORDER BY created_at DESC",
      [user.id]
    );

    const planRow = await pool.query(
      "SELECT plan FROM user_plans WHERE user_id = $1",
      [user.id]
    );
    const plan = (planRow.rows[0]?.plan ?? "free") as keyof typeof PLAN_LIMITS;
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

    return NextResponse.json({
      sites: result.rows,
      plan,
      limits,
    });
  } catch (err) {
    console.error("[hosting GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await ensureTables();

    const planRow = await pool.query("SELECT plan FROM user_plans WHERE user_id = $1", [user.id]);
    const plan = (planRow.rows[0]?.plan ?? "free") as keyof typeof PLAN_LIMITS;
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

    const siteCount = await pool.query(
      "SELECT COUNT(*) FROM hosting_sites WHERE user_id = $1",
      [user.id]
    );
    if (parseInt(siteCount.rows[0].count) >= limits.sites) {
      return NextResponse.json(
        { error: `현재 플랜(${plan})에서는 최대 ${limits.sites}개의 사이트만 생성할 수 있습니다.` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, subdomain, framework = "static" } = body;

    if (!name || !subdomain) {
      return NextResponse.json({ error: "사이트 이름과 서브도메인을 입력해주세요." }, { status: 400 });
    }

    const cleanSub = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 63);
    if (cleanSub.length < 3) {
      return NextResponse.json({ error: "서브도메인은 최소 3자 이상이어야 합니다." }, { status: 400 });
    }

    const existing = await pool.query(
      "SELECT id FROM hosting_sites WHERE subdomain = $1",
      [cleanSub]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "이미 사용 중인 서브도메인입니다." }, { status: 409 });
    }

    const subCheck = await pool.query(
      "SELECT id FROM subdomains WHERE subdomain = $1 LIMIT 1",
      [cleanSub]
    );
    if (subCheck.rows.length > 0) {
      return NextResponse.json({ error: "이미 사용 중인 서브도메인입니다." }, { status: 409 });
    }

    const { recordId, error: cfError } = await createCloudflareDnsRecord(
      cleanSub, "html", "krl.kr"
    );
    if (cfError) console.warn("[hosting] CF DNS warning:", cfError);

    const now = Date.now();
    const result = await pool.query(
      `INSERT INTO hosting_sites (user_id, name, subdomain, framework, status, storage_used, cf_dns_record_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', 0, $5, $6, $6) RETURNING *`,
      [user.id, name, cleanSub, framework, recordId ?? null, now]
    );
    const site = result.rows[0];

    // Create directory
    const siteDir = path.join(HOSTING_DIR, String(site.id));
    fs.mkdirSync(siteDir, { recursive: true });

    return NextResponse.json({ site }, { status: 201 });
  } catch (err) {
    console.error("[hosting POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
