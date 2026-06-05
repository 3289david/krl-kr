import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

// Pollinations.ai image models (free, no key needed)
const POLLINATIONS_IMAGE_URL = "https://image.pollinations.ai/prompt";

// Daily limits per plan
const DAILY_LIMITS: Record<string, number> = {
  free: 5,
  pro: 50,
  vip: 200,
};

const PLAN_MODELS: Record<string, string> = {
  free: "flux",        // free Pollinations model
  pro: "flux",         // same model, higher limit
  vip: "flux-pro",     // Pollinations flux-pro
};

async function ensureTable() {
  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_image_usage (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at BIGINT NOT NULL
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_ai_img_user_date ON ai_image_usage(user_id, created_at)
  `);
  return pool;
}

export async function GET(request: NextRequest) {
  // Return today's usage for the user
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await ensureTable();

    const planRow = await pool.query("SELECT plan FROM user_plans WHERE user_id = $1", [user.id]);
    const plan = planRow.rows[0]?.plan ?? "free";
    const dailyLimit = DAILY_LIMITS[plan] ?? DAILY_LIMITS.free;

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const usageRow = await pool.query(
      "SELECT COUNT(*) as count FROM ai_image_usage WHERE user_id = $1 AND created_at >= $2",
      [user.id, dayStart.getTime()]
    );
    const usedToday = parseInt(usageRow.rows[0]?.count ?? "0");

    return NextResponse.json({ used_today: usedToday, daily_limit: dailyLimit, plan });
  } catch (err) {
    console.error("[ai/image GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await ensureTable();

    const planRow = await pool.query("SELECT plan FROM user_plans WHERE user_id = $1", [user.id]);
    const plan = planRow.rows[0]?.plan ?? "free";
    const dailyLimit = DAILY_LIMITS[plan] ?? DAILY_LIMITS.free;

    // Check daily usage
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const usageRow = await pool.query(
      "SELECT COUNT(*) as count FROM ai_image_usage WHERE user_id = $1 AND created_at >= $2",
      [user.id, dayStart.getTime()]
    );
    const usedToday = parseInt(usageRow.rows[0]?.count ?? "0");

    if (usedToday >= dailyLimit) {
      return NextResponse.json(
        {
          error: `오늘 이미지 생성 한도(${dailyLimit}장)에 도달했습니다. 내일 다시 시도하거나 플랜을 업그레이드하세요.`,
          limit_reached: true,
          used: usedToday,
          limit: dailyLimit,
          plan,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { prompt, width = 1024, height = 1024, seed } = body;

    if (!prompt?.trim()) return NextResponse.json({ error: "프롬프트를 입력해주세요." }, { status: 400 });

    const model = PLAN_MODELS[plan] ?? "flux";
    const randomSeed = seed ?? Math.floor(Math.random() * 2147483647);

    const params = new URLSearchParams({
      model,
      width: String(Math.min(1024, Math.max(256, width))),
      height: String(Math.min(1024, Math.max(256, height))),
      nologo: "true",
      seed: String(randomSeed),
      enhance: plan !== "free" ? "true" : "false",
    });

    const imageUrl = `${POLLINATIONS_IMAGE_URL}/${encodeURIComponent(prompt.trim())}?${params}`;

    // Fetch the image from Pollinations
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(60000),
      headers: { "User-Agent": "KRL.KR/1.0" },
    });

    if (!response.ok) {
      console.error("[ai/image] Pollinations error:", response.status, response.statusText);
      return NextResponse.json({ error: "이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString("base64");

    // Record usage
    await pool.query(
      "INSERT INTO ai_image_usage (user_id, created_at) VALUES ($1, $2)",
      [user.id, Date.now()]
    );

    return NextResponse.json({
      base64,
      mime_type: contentType,
      model,
      seed: randomSeed,
      used_today: usedToday + 1,
      daily_limit: dailyLimit,
      plan,
    });
  } catch (err) {
    console.error("[ai/image POST]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
