import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? "";
const CF_ZONE = process.env.CLOUDFLARE_ZONE_ID ?? "";
const SERVER_IP = "194.163.184.59";

async function createBlogDnsRecord(slug: string): Promise<string | null> {
  if (!CF_TOKEN || !CF_ZONE) return null;
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/dns_records`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "A", name: `${slug}.krl.kr`, content: SERVER_IP, proxied: true, ttl: 1 }),
    });
    const data = await res.json() as { success: boolean; result?: { id: string } };
    if (data.success && data.result?.id) {
      console.log(`[blog] Created DNS A record for ${slug}.krl.kr → ${data.result.id}`);
      return data.result.id;
    }
  } catch (e) {
    console.error("[blog] DNS record creation failed:", e);
  }
  return null;
}

export async function deleteBlogDnsRecord(cfRecordId: string): Promise<void> {
  if (!CF_TOKEN || !CF_ZONE || !cfRecordId) return;
  try {
    await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/dns_records/${cfRecordId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${CF_TOKEN}` },
    });
    console.log(`[blog] Deleted DNS record ${cfRecordId}`);
  } catch (e) {
    console.error("[blog] DNS record deletion failed:", e);
  }
}

export const runtime = "nodejs";

const RESERVED = new Set(["www","api","mail","app","admin","blog","shop","store","dev","staging",
  "prod","beta","alpha","test","demo","cdn","static","assets","media","img","images","video",
  "docs","help","support","status","dashboard","panel","auth","login","register","krl","kr","krlkr",
  "search","chat","drive","email","hosting","paste","qr","tools","community","bio","webhook",
  "ai","about","contact","pricing","features","legal","changelog","llms","f","p","yt"]);

const PLAN_BLOG_LIMIT: Record<string, number> = { free: 1, pro: 5, vip: 9999 };

export async function ensureBlogTables(pool: import("pg").Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blogs (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      custom_domain TEXT UNIQUE,
      theme TEXT NOT NULL DEFAULT 'default',
      primary_color TEXT NOT NULL DEFAULT '#2563eb',
      font TEXT NOT NULL DEFAULT 'system',
      custom_css TEXT,
      is_public BOOLEAN NOT NULL DEFAULT TRUE,
      footer_text TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id SERIAL PRIMARY KEY,
      blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      excerpt TEXT,
      cover_image TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at BIGINT,
      scheduled_at BIGINT,
      tags TEXT[] DEFAULT '{}',
      seo_title TEXT,
      seo_description TEXT,
      view_count INTEGER NOT NULL DEFAULT 0,
      created_at BIGINT NOT NULL,
      updated_at BIGINT,
      UNIQUE(blog_id, slug)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blog_comments (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
      author_name TEXT NOT NULL,
      author_email TEXT,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at BIGINT NOT NULL
    )
  `);
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    await ensureBlogTables(pool);

    const result = await pool.query(
      `SELECT b.*,
        (SELECT COUNT(*) FROM blog_posts WHERE blog_id = b.id AND status = 'published') as post_count
       FROM blogs b WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
      [user.id]
    );

    const planRow = await pool.query("SELECT plan FROM user_plans WHERE user_id = $1", [user.id]);
    const plan = planRow.rows[0]?.plan ?? "free";

    return NextResponse.json({ blogs: result.rows, plan, blog_limit: PLAN_BLOG_LIMIT[plan] ?? 1 });
  } catch (err) {
    console.error("[blog GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    await ensureBlogTables(pool);

    const planRow = await pool.query("SELECT plan FROM user_plans WHERE user_id = $1", [user.id]);
    const plan = planRow.rows[0]?.plan ?? "free";
    const limit = PLAN_BLOG_LIMIT[plan] ?? 1;

    const countResult = await pool.query("SELECT COUNT(*) as c FROM blogs WHERE user_id = $1", [user.id]);
    if (parseInt(countResult.rows[0]?.c ?? "0") >= limit) {
      return NextResponse.json({ error: `플랜 한도(${limit}개)에 도달했습니다.` }, { status: 403 });
    }

    const body = await request.json();
    const { slug, title, description } = body;

    if (!slug || !title) return NextResponse.json({ error: "슬러그와 제목을 입력하세요." }, { status: 400 });

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
    if (cleanSlug.length < 2) return NextResponse.json({ error: "슬러그는 2자 이상이어야 합니다." }, { status: 400 });
    if (RESERVED.has(cleanSlug)) return NextResponse.json({ error: "예약된 슬러그입니다." }, { status: 400 });

    const cfRecordId = await createBlogDnsRecord(cleanSlug);

    const result = await pool.query(
      `INSERT INTO blogs (user_id, slug, title, description, cf_dns_record_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING *`,
      [user.id, cleanSlug, title.trim(), description?.trim() ?? null, cfRecordId, Date.now()]
    );

    return NextResponse.json({ blog: result.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "이미 사용 중인 슬러그입니다." }, { status: 409 });
    }
    console.error("[blog POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
