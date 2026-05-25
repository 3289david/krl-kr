import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth, hashPassword, getSessionFromRequest } from "@/lib/auth";
import { generateId, generateSlug } from "@/lib/utils";
import { z } from "zod";

const CreatePasteSchema = z.object({
  content: z.string().min(1, "내용을 입력해주세요.").max(1_000_000, "최대 1MB까지 가능합니다."),
  title: z.string().max(200).optional(),
  language: z
    .enum(["plaintext", "javascript", "typescript", "python", "html", "css", "json", "bash", "sql", "go", "rust", "markdown", "yaml", "xml"])
    .optional(),
  password: z.string().max(100).optional(),
  expires_at: z.string().optional().nullable(),
  is_public: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

    const body = await request.json();
    const parsed = CreatePasteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Try to get user (optional)
    const session = await getSessionFromRequest(request);
    let userId: string | null = null;
    if (session) {
      userId = session.userId;
    }

    // Generate unique slug
    let slug = generateSlug(8);
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db
        .prepare("SELECT id FROM pastes WHERE slug = ? LIMIT 1")
        .bind(slug)
        .first();
      if (!existing) break;
      slug = generateSlug(8 + Math.floor(attempts / 3));
      attempts++;
    }

    let passwordHash: string | null = null;
    if (data.password) {
      passwordHash = await hashPassword(data.password);
    }

    let expiresAt: number | null = null;
    if (data.expires_at) {
      expiresAt = new Date(data.expires_at).getTime();
      if (isNaN(expiresAt)) {
        return NextResponse.json({ error: "잘못된 날짜 형식입니다." }, { status: 400 });
      }
    }

    const pasteId = generateId("pst");
    const now = Date.now();

    await db
      .prepare(
        `INSERT INTO pastes (id, user_id, slug, title, content, language, password_hash, expires_at, is_public, view_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
      )
      .bind(
        pasteId,
        userId,
        slug,
        data.title ?? null,
        data.content,
        data.language ?? "plaintext",
        passwordHash,
        expiresAt,
        data.is_public !== false ? 1 : 0,
        now
      )
      .run();

    return NextResponse.json(
      {
        id: pasteId,
        slug,
        url: `https://krl.kr/p/${slug}`,
        title: data.title ?? null,
        language: data.language ?? "plaintext",
        has_password: !!passwordHash,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        created_at: new Date(now).toISOString(),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[/api/v1/paste POST] Error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));
    const offset = (page - 1) * limit;

    const result = await db
      .prepare(
        `SELECT id, slug, title, language, is_public, expires_at, view_count, created_at
         FROM pastes WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(user.id, limit, offset)
      .all<Record<string, unknown>>();

    const countResult = await db
      .prepare("SELECT COUNT(*) as count FROM pastes WHERE user_id = ?")
      .bind(user.id)
      .first<{ count: number }>();

    const total = countResult?.count ?? 0;

    return NextResponse.json({
      pastes: result.results,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[/api/v1/paste GET] Error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
