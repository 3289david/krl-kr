/**
 * KRL.KR — Email Alias API
 * POST /api/v1/email  → 이메일 별칭 생성 (name@mail.krl.kr → 사용자 이메일 포워딩)
 * GET  /api/v1/email  → 내 별칭 목록
 * DELETE /api/v1/email?id=xxx → 별칭 삭제
 *
 * 동작 방식:
 *  1. 사용자가 별칭 생성 요청
 *  2. DB에 저장 (email_aliases 테이블)
 *  3. Cloudflare Email Routing API로 실제 포워딩 룰 생성
 *     - 플랫폼 소유자의 CF API 토큰 사용 (사용자는 CF 계정 불필요)
 *     - name@mail.krl.kr → 사용자의 가입 이메일로 자동 전달
 *
 * 모든 사용자가 사용 가능 (free: 1개, pro: 5개, business: 무제한)
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import { createEmailForwardingRule, deleteEmailForwardingRule } from "@/lib/email";
import { z } from "zod";

const CreateAliasSchema = z.object({
  alias: z
    .string()
    .min(3, "별칭은 최소 3자 이상이어야 합니다.")
    .max(64, "별칭은 최대 64자까지 가능합니다.")
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/,
      "영문자, 숫자, 점(.), 하이픈(-), 언더스코어(_)만 사용 가능합니다."
    ),
});

// 플랜별 최대 별칭 수
const PLAN_ALIAS_LIMITS: Record<string, number> = {
  free: 1,
  pro: 5,
  business: 999,
};

// ─── GET /api/v1/email ────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const result = await db
      .prepare(
        `SELECT id, alias, forward_to, cf_rule_id, is_active, created_at
         FROM email_aliases
         WHERE user_id = ?
         ORDER BY created_at DESC`
      )
      .bind(user.id)
      .all<{
        id: string;
        alias: string;
        forward_to: string;
        cf_rule_id: string | null;
        is_active: number;
        created_at: number;
      }>();

    const limit = PLAN_ALIAS_LIMITS[user.plan] ?? 1;

    return NextResponse.json({
      aliases: result.results.map((a) => ({
        id: a.id,
        alias: a.alias,
        email: `${a.alias}@mail.krl.kr`,
        forward_to: a.forward_to,
        is_active: a.is_active === 1,
        cf_configured: !!a.cf_rule_id,
        created_at: new Date(a.created_at).toISOString(),
      })),
      limit,
      used: result.results.length,
      remaining: Math.max(0, limit - result.results.length),
    });
  } catch (err) {
    console.error("[/api/v1/email GET]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// ─── POST /api/v1/email ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const parsed = CreateAliasSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    const { alias } = parsed.data;
    const aliasLower = alias.toLowerCase();
    const fullEmail = `${aliasLower}@mail.krl.kr`;

    // 플랜별 한도 체크
    const limit = PLAN_ALIAS_LIMITS[user.plan] ?? 1;
    const currentCount = await db
      .prepare("SELECT COUNT(*) as count FROM email_aliases WHERE user_id = ?")
      .bind(user.id)
      .first<{ count: number }>();

    if ((currentCount?.count ?? 0) >= limit) {
      return NextResponse.json(
        {
          error: `현재 플랜(${user.plan})에서는 최대 ${limit}개의 이메일 별칭을 만들 수 있습니다.`,
          code: "LIMIT_REACHED",
          upgrade_url: "/pricing",
        },
        { status: 403 }
      );
    }

    // 중복 체크
    const existing = await db
      .prepare("SELECT id FROM email_aliases WHERE alias = ?")
      .bind(aliasLower)
      .first();

    if (existing) {
      return NextResponse.json(
        { error: "이미 사용 중인 이메일 별칭입니다." },
        { status: 409 }
      );
    }

    // 예약어 차단
    const RESERVED_ALIASES = new Set([
      "admin", "administrator", "support", "help", "info", "contact",
      "noreply", "no-reply", "postmaster", "hostmaster", "webmaster",
      "abuse", "security", "legal", "billing", "sales", "marketing",
    ]);
    if (RESERVED_ALIASES.has(aliasLower)) {
      return NextResponse.json(
        { error: "사용할 수 없는 이메일 별칭입니다." },
        { status: 400 }
      );
    }

    const now = Date.now();
    const aliasId = generateId("ema");

    // ── 1. Cloudflare Email Routing API로 실제 포워딩 룰 생성 ─────────────────
    //    플랫폼 소유자의 CF API 토큰 사용 → 사용자는 CF 계정 불필요
    const { ruleId, error: cfError } = await createEmailForwardingRule(
      aliasLower,
      user.email
    );

    if (cfError && !ruleId) {
      console.warn(
        `[Email Alias] CF API 미설정 또는 오류 (alias: ${aliasLower}): ${cfError}`
      );
      // CF 미설정 시에도 DB에는 저장 (CF 설정 후 나중에 활성화 가능)
    }

    // ── 2. DB에 저장 ──────────────────────────────────────────────────────────
    await db
      .prepare(
        `INSERT INTO email_aliases (id, user_id, alias, forward_to, cf_rule_id, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)`
      )
      .bind(aliasId, user.id, aliasLower, user.email, ruleId ?? null, now)
      .run();

    const cfConfigured = !!ruleId;

    return NextResponse.json(
      {
        id: aliasId,
        alias: aliasLower,
        email: fullEmail,
        forward_to: user.email,
        is_active: true,
        cf_configured: cfConfigured,
        created_at: new Date(now).toISOString(),
        message: cfConfigured
          ? `${fullEmail} 주소로 오는 이메일이 ${user.email}로 자동 전달됩니다.`
          : `별칭이 등록되었습니다. Cloudflare 설정 후 포워딩이 활성화됩니다.`,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[/api/v1/email POST]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// ─── DELETE /api/v1/email?id=xxx ─────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const aliasId = searchParams.get("id");

    if (!aliasId) {
      return NextResponse.json({ error: "별칭 ID를 입력해주세요." }, { status: 400 });
    }

    // 소유권 확인
    const alias = await db
      .prepare("SELECT * FROM email_aliases WHERE id = ? AND user_id = ?")
      .bind(aliasId, user.id)
      .first<{ id: string; alias: string; cf_rule_id: string | null }>();

    if (!alias) {
      return NextResponse.json({ error: "별칭을 찾을 수 없습니다." }, { status: 404 });
    }

    // Cloudflare 룰 삭제
    if (alias.cf_rule_id) {
      await deleteEmailForwardingRule(alias.cf_rule_id);
    }

    // DB에서 삭제
    await db
      .prepare("DELETE FROM email_aliases WHERE id = ? AND user_id = ?")
      .bind(aliasId, user.id)
      .run();

    return NextResponse.json({ success: true, deleted: alias.alias });
  } catch (err) {
    console.error("[/api/v1/email DELETE]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
