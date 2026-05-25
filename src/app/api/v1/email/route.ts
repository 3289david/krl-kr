import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import { z } from "zod";

const CreateAliasSchema = z.object({
  alias: z
    .string()
    .min(3, "별칭은 최소 3자 이상이어야 합니다.")
    .max(64, "별칭은 최대 64자까지 가능합니다.")
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, "별칭에 유효하지 않은 문자가 포함되어 있습니다."),
});

// Table: email_aliases (needs to be added via migration)
// We store it alongside sessions using a simple approach

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    // Try to get from email_aliases table (may not exist yet)
    try {
      const result = await db
        .prepare(
          "SELECT id, alias, forward_to, is_active, created_at FROM email_aliases WHERE user_id = ? ORDER BY created_at DESC"
        )
        .bind(user.id)
        .all<Record<string, unknown>>();

      return NextResponse.json({
        aliases: result.results.map((a) => ({
          ...a,
          email: `${a.alias}@mail.krl.kr`,
        })),
      });
    } catch {
      // Table might not exist yet
      return NextResponse.json({ aliases: [] });
    }
  } catch (err) {
    console.error("[/api/v1/email GET] Error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    // Check plan
    if (user.plan === "free") {
      return NextResponse.json(
        { error: "이메일 별칭 서비스는 프로 플랜 이상에서 이용 가능합니다.", code: "PLAN_REQUIRED" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = CreateAliasSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const { alias } = parsed.data;
    const fullEmail = `${alias}@mail.krl.kr`;
    const now = Date.now();

    // Ensure table exists
    try {
      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS email_aliases (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            alias TEXT UNIQUE NOT NULL,
            forward_to TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL
          )`
        )
        .run();
    } catch {
      // Table may already exist
    }

    // Check uniqueness
    try {
      const existing = await db
        .prepare("SELECT id FROM email_aliases WHERE alias = ? LIMIT 1")
        .bind(alias.toLowerCase())
        .first();

      if (existing) {
        return NextResponse.json({ error: "이미 사용 중인 이메일 별칭입니다." }, { status: 409 });
      }
    } catch {
      // Ignore if table doesn't exist
    }

    const aliasId = generateId("ema");

    try {
      await db
        .prepare(
          `INSERT INTO email_aliases (id, user_id, alias, forward_to, is_active, created_at)
           VALUES (?, ?, ?, ?, 1, ?)`
        )
        .bind(aliasId, user.id, alias.toLowerCase(), user.email, now)
        .run();
    } catch (dbErr) {
      console.error("Email alias insert error:", dbErr);
      return NextResponse.json({ error: "이메일 별칭 생성에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json(
      {
        id: aliasId,
        alias: alias.toLowerCase(),
        email: fullEmail,
        forward_to: user.email,
        is_active: true,
        created_at: new Date(now).toISOString(),
        note: "이메일은 등록된 계정 이메일로 전달됩니다.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[/api/v1/email POST] Error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
