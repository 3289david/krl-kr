import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth, hashPassword } from "@/lib/auth";
import { isValidUrl, normalizeUrl } from "@/lib/utils";
import { z } from "zod";

const UpdateSchema = z.object({
  url: z.string().optional(),
  slug: z.string().optional(),
  title: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  password: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  max_clicks: z.number().int().positive().optional().nullable(),
  is_dynamic: z.boolean().optional(),
  ios_url: z.string().optional().nullable(),
  android_url: z.string().optional().nullable(),
  geo_rules: z.string().optional().nullable(),
  device_rules: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDB(request);
  if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const link = await db
    .prepare("SELECT * FROM links WHERE id = ? AND user_id = ? LIMIT 1")
    .bind(id, user.id)
    .first<Record<string, unknown>>();

  if (!link) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ link });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDB(request);
  if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const existing = await db
    .prepare("SELECT id FROM links WHERE id = ? AND user_id = ? LIMIT 1")
    .bind(id, user.id)
    .first();

  if (!existing) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await request.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const updates: Record<string, unknown> = {};

  if (data.url !== undefined) {
    const normalizedUrl = normalizeUrl(data.url);
    if (!isValidUrl(normalizedUrl)) {
      return NextResponse.json({ error: "유효한 URL을 입력해주세요." }, { status: 400 });
    }
    updates.original_url = normalizedUrl;
  }

  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.max_clicks !== undefined) updates.max_clicks = data.max_clicks;
  if (data.is_dynamic !== undefined) updates.is_dynamic = data.is_dynamic ? 1 : 0;
  if (data.ios_url !== undefined) updates.ios_url = data.ios_url;
  if (data.android_url !== undefined) updates.android_url = data.android_url;
  if (data.geo_rules !== undefined) updates.geo_rules = data.geo_rules;
  if (data.device_rules !== undefined) updates.device_rules = data.device_rules;
  if (data.is_active !== undefined) updates.is_active = data.is_active ? 1 : 0;

  if (data.expires_at !== undefined) {
    if (data.expires_at === null) {
      updates.expires_at = null;
    } else {
      const ts = new Date(data.expires_at).getTime();
      if (isNaN(ts)) {
        return NextResponse.json({ error: "잘못된 날짜 형식입니다." }, { status: 400 });
      }
      updates.expires_at = ts;
    }
  }

  if (data.password !== undefined) {
    updates.password_hash = data.password ? await hashPassword(data.password) : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "업데이트할 항목이 없습니다." }, { status: 400 });
  }

  const fields = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
  const values = Object.values(updates);

  await db
    .prepare(`UPDATE links SET ${fields}, updated_at = ? WHERE id = ?`)
    .bind(...values, Date.now(), id)
    .run();

  const updated = await db
    .prepare("SELECT * FROM links WHERE id = ? LIMIT 1")
    .bind(id)
    .first<Record<string, unknown>>();

  return NextResponse.json({ link: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDB(request);
  if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const result = await db
    .prepare("DELETE FROM links WHERE id = ? AND user_id = ?")
    .bind(id, user.id)
    .run();

  const changes = (result.meta as { changes?: number })?.changes ?? 0;
  if (changes === 0) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
