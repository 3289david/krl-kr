import { handleAPIError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import { z } from "zod";

const BioSchema = z.object({
  username: z
    .string()
    .min(3, "사용자명은 최소 3자 이상이어야 합니다.")
    .max(30, "사용자명은 최대 30자까지 가능합니다.")
    .regex(/^[a-zA-Z0-9_]+$/, "사용자명은 영문자, 숫자, 언더스코어(_)만 사용 가능합니다."),
  display_name: z.string().max(100).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  theme: z.enum(["default", "dark", "minimal"]).optional(),
  links: z
    .array(
      z.object({
        title: z.string().max(100),
        url: z.string().url(),
        icon: z.string().optional(),
      })
    )
    .max(20)
    .optional(),
  social: z
    .object({
      twitter: z.string().optional(),
      instagram: z.string().optional(),
      github: z.string().optional(),
      youtube: z.string().optional(),
      tiktok: z.string().optional(),
      linkedin: z.string().optional(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const page = await db
      .prepare("SELECT * FROM bio_pages WHERE user_id = ? LIMIT 1")
      .bind(user.id)
      .first<Record<string, unknown>>();

    if (!page) {
      return NextResponse.json({ page: null });
    }

    return NextResponse.json({
      page: {
        ...page,
        links: (() => { try { return JSON.parse(page.links as string); } catch { return []; } })(),
        social: (() => { try { return JSON.parse(page.social as string); } catch { return {}; } })(),
      },
    });
  } catch (err) {
    console.error("[/api/v1/bio GET] Error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return upsertBioPage(request);
}

export async function PATCH(request: NextRequest) {
  return upsertBioPage(request);
}

async function upsertBioPage(request: NextRequest) {
  try {
    const db = getDB(request);
    if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const parsed = BioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check username uniqueness (excluding current user)
    const usernameCheck = await db
      .prepare("SELECT user_id FROM bio_pages WHERE username = ? LIMIT 1")
      .bind(data.username)
      .first<{ user_id: string }>();

    if (usernameCheck && usernameCheck.user_id !== user.id) {
      return NextResponse.json(
        { error: "이미 사용 중인 사용자명입니다." },
        { status: 409 }
      );
    }

    const existing = await db
      .prepare("SELECT id FROM bio_pages WHERE user_id = ? LIMIT 1")
      .bind(user.id)
      .first<{ id: string }>();

    const now = Date.now();
    const linksJson = JSON.stringify(data.links ?? []);
    const socialJson = JSON.stringify(data.social ?? {});

    if (existing) {
      await db
        .prepare(
          `UPDATE bio_pages SET username = ?, display_name = ?, bio = ?, avatar_url = ?,
           theme = ?, links = ?, social = ?, updated_at = ? WHERE user_id = ?`
        )
        .bind(
          data.username,
          data.display_name ?? null,
          data.bio ?? null,
          data.avatar_url ?? null,
          data.theme ?? "default",
          linksJson,
          socialJson,
          now,
          user.id
        )
        .run();
    } else {
      const pageId = generateId("bio");
      await db
        .prepare(
          `INSERT INTO bio_pages (id, user_id, username, display_name, bio, avatar_url, theme, links, social, is_active, view_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`
        )
        .bind(
          pageId,
          user.id,
          data.username,
          data.display_name ?? null,
          data.bio ?? null,
          data.avatar_url ?? null,
          data.theme ?? "default",
          linksJson,
          socialJson,
          now,
          now
        )
        .run();
    }

    const page = await db
      .prepare("SELECT * FROM bio_pages WHERE user_id = ? LIMIT 1")
      .bind(user.id)
      .first<Record<string, unknown>>();

    return NextResponse.json({
      page: {
        ...page,
        links: (() => { try { return JSON.parse(page!.links as string); } catch { return []; } })(),
        social: (() => { try { return JSON.parse(page!.social as string); } catch { return {}; } })(),
      },
    });
  } catch (err) {
    console.error("[/api/v1/bio upsert] Error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
