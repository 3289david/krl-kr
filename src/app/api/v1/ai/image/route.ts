import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

const IMAGEROUTER_URL = "https://api.imagerouter.io/v1/openai/images/generations";
const IMAGEROUTER_MODEL = "black-forest-labs/FLUX-2-klein-9b";
const POLLINATIONS_IMAGE_URL = "https://image.pollinations.ai/prompt";

const DAILY_LIMITS: Record<string, number> = {
  free: 0,
  pro: 50,
  vip: 200,
};

async function ensureTable() {
  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_image_usage (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at BIGINT NOT NULL
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_ai_img_user_date ON ai_image_usage(user_id, created_at)
  `);
  return pool;
}

async function generateWithImageRouter(prompt: string, width: number, height: number): Promise<{ base64: string; mime_type: string; model: string } | null> {
  const apiKey = process.env.IMAGEROUTER_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(IMAGEROUTER_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: IMAGEROUTER_MODEL, prompt: prompt.trim(), n: 1, size: `${width}x${height}` }),
    signal: AbortSignal.timeout(60000),
  });

  const data = await res.json() as { data?: Array<{ url?: string; b64_json?: string }>; error?: { message: string } };

  if (!res.ok || data.error) {
    console.error("[ai/image] imagerouter error:", data.error?.message ?? res.status);
    return null;
  }

  const item = data.data?.[0];
  if (!item) return null;

  if (item.b64_json) return { base64: item.b64_json, mime_type: "image/png", model: IMAGEROUTER_MODEL };

  if (item.url) {
    const imgRes = await fetch(item.url, { signal: AbortSignal.timeout(30000) });
    if (!imgRes.ok) return null;
    const buf = Buffer.from(await imgRes.arrayBuffer());
    return { base64: buf.toString("base64"), mime_type: "image/png", model: IMAGEROUTER_MODEL };
  }

  return null;
}

async function generateWithPollinations(prompt: string, width: number, height: number, plan: string): Promise<{ base64: string; mime_type: string; model: string }> {
  const model = plan === "vip" ? "flux-pro" : "flux";
  const params = new URLSearchParams({
    model, width: String(width), height: String(height),
    nologo: "true", seed: String(Math.floor(Math.random() * 2147483647)), enhance: "true",
  });
  const res = await fetch(`${POLLINATIONS_IMAGE_URL}/${encodeURIComponent(prompt.trim())}?${params}`, {
    signal: AbortSignal.timeout(60000), headers: { "User-Agent": "KRL.KR/1.0" },
  });
  if (!res.ok) throw new Error(`Pollinations error: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString("base64"), mime_type: res.headers.get("content-type") ?? "image/jpeg", model };
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await ensureTable();
    const planRow = await pool.query("SELECT plan FROM user_plans WHERE user_id = $1", [user.id]);
    const plan = planRow.rows[0]?.plan ?? "free";
    const dailyLimit = DAILY_LIMITS[plan] ?? 0;

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

    if (plan === "free") {
      return NextResponse.json(
        { error: "AI 이미지 생성은 Pro 이상 플랜에서만 사용 가능합니다.", upgrade_required: true },
        { status: 403 }
      );
    }

    const dailyLimit = DAILY_LIMITS[plan] ?? 0;
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const usageRow = await pool.query(
      "SELECT COUNT(*) as count FROM ai_image_usage WHERE user_id = $1 AND created_at >= $2",
      [user.id, dayStart.getTime()]
    );
    const usedToday = parseInt(usageRow.rows[0]?.count ?? "0");

    if (usedToday >= dailyLimit) {
      return NextResponse.json(
        { error: `오늘 이미지 생성 한도(${dailyLimit}장)에 도달했습니다.`, limit_reached: true, used: usedToday, limit: dailyLimit, plan },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { prompt, width = 1024, height = 1024 } = body;
    if (!prompt?.trim()) return NextResponse.json({ error: "프롬프트를 입력해주세요." }, { status: 400 });

    const w = Math.min(1024, Math.max(256, width));
    const h = Math.min(1024, Math.max(256, height));

    let result = await generateWithImageRouter(prompt, w, h).catch(() => null);
    if (!result) {
      result = await generateWithPollinations(prompt, w, h, plan);
    }

    await pool.query("INSERT INTO ai_image_usage (user_id, created_at) VALUES ($1, $2)", [user.id, Date.now()]);

    return NextResponse.json({ base64: result.base64, mime_type: result.mime_type, model: result.model, used_today: usedToday + 1, daily_limit: dailyLimit, plan });
  } catch (err) {
    console.error("[ai/image POST]", err);
    return NextResponse.json({ error: "이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
