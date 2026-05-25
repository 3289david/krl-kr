import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth, getSessionFromRequest } from "@/lib/auth";
import { generateId, generateSlug } from "@/lib/utils";
import { z } from "zod";

const CreateWebhookSchema = z.object({
  label: z.string().max(100).optional(),
  expires_in_hours: z.number().int().min(1).max(720).optional(), // max 30 days
});

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

    const session = await getSessionFromRequest(request);
    let userId: string | null = null;
    if (session) {
      userId = session.userId;
    }

    const body = await request.json().catch(() => ({}));
    const parsed = CreateWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const data = parsed.data;

    // Generate unique slug
    let slug = generateSlug(10);
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db
        .prepare("SELECT id FROM webhook_endpoints WHERE slug = ? LIMIT 1")
        .bind(slug)
        .first();
      if (!existing) break;
      slug = generateSlug(10 + Math.floor(attempts / 3));
      attempts++;
    }

    const endpointId = generateId("whe");
    const now = Date.now();
    const expiresAt = data.expires_in_hours
      ? now + data.expires_in_hours * 60 * 60 * 1000
      : now + 7 * 24 * 60 * 60 * 1000; // 7 days default

    await db
      .prepare(
        `INSERT INTO webhook_endpoints (id, user_id, slug, label, expires_at, request_count, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)`
      )
      .bind(endpointId, userId, slug, data.label ?? null, expiresAt, now)
      .run();

    return NextResponse.json(
      {
        id: endpointId,
        slug,
        url: `https://krl.kr/w/${slug}`,
        inspect_url: `https://krl.kr/api/v1/webhook/${slug}?inspect=1`,
        label: data.label ?? null,
        expires_at: new Date(expiresAt).toISOString(),
        created_at: new Date(now).toISOString(),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[/api/v1/webhook POST] Error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const result = await db
      .prepare(
        `SELECT id, slug, label, expires_at, request_count, created_at
         FROM webhook_endpoints WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
      )
      .bind(user.id)
      .all<Record<string, unknown>>();

    return NextResponse.json({ endpoints: result.results });
  } catch (err) {
    console.error("[/api/v1/webhook GET] Error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
