import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

const DRIVE_DIR = "/var/www/krl-kr/drive";
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
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_img_user_date ON ai_image_usage(user_id, created_at)`);
  return pool;
}

async function generateWithPollinations(prompt: string, width: number, height: number, plan: string): Promise<{ base64: string; mime_type: string; model: string } | null> {
  try {
    const model = plan === "vip" ? "flux-pro" : "flux";
    const params = new URLSearchParams({
      model, width: String(width), height: String(height),
      nologo: "true", seed: String(Math.floor(Math.random() * 2147483647)), enhance: "true",
    });
    const res = await fetch(`${POLLINATIONS_IMAGE_URL}/${encodeURIComponent(prompt.trim())}?${params}`, {
      signal: AbortSignal.timeout(60000), headers: { "User-Agent": "KRL.KR/1.0" },
    });
    if (!res.ok) {
      console.warn("[ai/image] Pollinations error:", res.status);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return null; // likely an error page
    return { base64: buf.toString("base64"), mime_type: res.headers.get("content-type") ?? "image/jpeg", model };
  } catch (err) {
    console.warn("[ai/image] Pollinations failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function generateWithImageRouter(prompt: string, width: number, height: number): Promise<{ base64: string; mime_type: string; model: string } | null> {
  const apiKey = process.env.IMAGEROUTER_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(IMAGEROUTER_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: IMAGEROUTER_MODEL, prompt: prompt.trim(), n: 1, size: `${width}x${height}` }),
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json() as { data?: Array<{ url?: string; b64_json?: string }>; error?: { message: string } };
    if (!res.ok || data.error) {
      console.warn("[ai/image] ImageRouter error:", data.error?.message ?? res.status);
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
  } catch (err) {
    console.warn("[ai/image] ImageRouter failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function generateWithDallE(prompt: string, width: number, height: number): Promise<{ base64: string; mime_type: string; model: string } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    // DALL-E 3 supported sizes
    const size = width > height ? "1792x1024" : width < height ? "1024x1792" : "1024x1024";
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "dall-e-3", prompt: prompt.trim(), n: 1, size, response_format: "b64_json" }),
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn("[ai/image] DALL-E error:", err.slice(0, 200));
      return null;
    }
    const data = await res.json() as { data?: Array<{ b64_json?: string }> };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) return null;
    return { base64: b64, mime_type: "image/png", model: "dall-e-3" };
  } catch (err) {
    console.warn("[ai/image] DALL-E failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function saveToDrive(
  pool: import("pg").Pool,
  userId: string,
  base64: string,
  mimeType: string,
  prompt: string
): Promise<number | null> {
  try {
    const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg"
      : mimeType.includes("webp") ? "webp" : "png";
    const userDir = path.join(DRIVE_DIR, userId);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

    const filename = `ai-${Date.now()}.${ext}`;
    const filePath = path.join(userDir, filename);
    const buf = Buffer.from(base64, "base64");
    fs.writeFileSync(filePath, buf);

    const label = prompt.length > 50 ? prompt.slice(0, 50).trim() + "…" : prompt.trim();
    const name = `AI - ${label}.${ext}`;
    const now = Date.now();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS drive_files (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        parent_id INTEGER REFERENCES drive_files(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('file', 'folder')),
        mime_type TEXT,
        size BIGINT DEFAULT 0,
        storage_path TEXT,
        share_token TEXT UNIQUE,
        is_shared BOOLEAN DEFAULT FALSE,
        created_at BIGINT NOT NULL,
        updated_at BIGINT
      )
    `);

    const result = await pool.query(`
      INSERT INTO drive_files (user_id, name, type, mime_type, size, storage_path, parent_id, created_at, updated_at)
      VALUES ($1, $2, 'file', $3, $4, $5, NULL, $6, $6) RETURNING id
    `, [userId, name, mimeType, buf.length, filePath, now]);

    console.log(`[ai/image] Saved to Drive: ${name} (id=${result.rows[0]?.id})`);
    return result.rows[0]?.id ?? null;
  } catch (err) {
    console.error("[ai/image] Drive save failed:", err);
    return null;
  }
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

    // 1. Try Pollinations first (free)
    let result = await generateWithPollinations(prompt, w, h, plan);

    // 2. Fall back to ImageRouter (paid FLUX)
    if (!result) {
      console.warn("[ai/image] Pollinations unavailable, trying ImageRouter");
      result = await generateWithImageRouter(prompt, w, h);
    }

    // 3. Fall back to DALL-E 3 (OpenAI)
    if (!result) {
      console.warn("[ai/image] ImageRouter unavailable, trying DALL-E");
      result = await generateWithDallE(prompt, w, h);
    }

    if (!result) {
      return NextResponse.json({ error: "이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
    }

    await pool.query("INSERT INTO ai_image_usage (user_id, created_at) VALUES ($1, $2)", [user.id, Date.now()]);

    // Auto-save to Drive
    const driveFileId = await saveToDrive(pool, user.id, result.base64, result.mime_type, prompt);

    return NextResponse.json({
      base64: result.base64,
      mime_type: result.mime_type,
      model: result.model,
      used_today: usedToday + 1,
      daily_limit: dailyLimit,
      plan,
      drive_file_id: driveFileId,
    });
  } catch (err) {
    console.error("[ai/image POST]", err);
    return NextResponse.json({ error: "이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
