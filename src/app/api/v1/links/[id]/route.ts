import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth, hashPassword } from "@/lib/auth";
import { isValidUrl, normalizeUrl } from "@/lib/utils";
import { invalidateSlug } from "@/lib/cache";
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

  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  // 기존 링크 조회 (슬러그 캐시 무효화에 필요)
  const existing = await db
    .prepare("SELECT id, slug FROM links WHERE id = ? AND user_id = ? LIMIT 1")
    .bind(id, user.id)
    .first<{ id: string; slug: string }>();

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

  // 슬러그 변경 허용
  if (data.slug !== undefined) {
    updates.slug = data.slug;
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

  // 엣지 KV 캐시 무효화 (비동기 — 응답을 블로킹하지 않음)
  const newSlug = typeof data.slug === "string" ? data.slug : null;
  const slugsToInvalidate = [existing.slug];
  if (newSlug && newSlug !== existing.slug) slugsToInvalidate.push(newSlug);
  invalidateSlug(existing.slug).catch(console.warn);
  if (newSlug && newSlug !== existing.slug) {
    invalidateSlug(newSlug).catch(console.warn);
  }

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

  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  // 슬러그 먼저 조회 (삭제 후에는 조회 불가)
  const link = await db
    .prepare("SELECT slug FROM links WHERE id = ? AND user_id = ? LIMIT 1")
    .bind(id, user.id)
    .first<{ slug: string }>();

  if (!link) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다." }, { status: 404 });
  }

  await db
    .prepare("DELETE FROM links WHERE id = ? AND user_id = ?")
    .bind(id, user.id)
    .run();

  // 엣지 KV 캐시 무효화
  invalidateSlug(link.slug).catch(console.warn);

  return NextResponse.json({ success: true });
}
