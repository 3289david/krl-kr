import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import { z } from "zod";

const RESERVED_SUBDOMAINS = new Set([
  "www", "api", "mail", "app", "admin", "blog", "shop", "store", "dev",
  "staging", "prod", "beta", "alpha", "test", "demo", "cdn", "static",
  "assets", "media", "img", "images", "video", "docs", "help", "support",
  "status", "dashboard", "panel", "auth", "login", "ns1", "ns2",
]);

const CreateSubdomainSchema = z.object({
  subdomain: z
    .string()
    .min(4, "서브도메인은 최소 4자 이상이어야 합니다.")
    .max(63, "서브도메인은 최대 63자까지 가능합니다.")
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
      "서브도메인은 소문자, 숫자, 하이픈(-)만 사용 가능하며 하이픈으로 시작/끝날 수 없습니다."
    ),
  type: z.enum(["github", "vercel", "html", "redirect", "api"]),
  target: z.string().min(1, "대상 URL을 입력해주세요."),
});

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    // Check plan
    if (user.plan === "free") {
      return NextResponse.json(
        { error: "서브도메인 서비스는 프로 플랜 이상에서 이용 가능합니다.", code: "PLAN_REQUIRED" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = CreateSubdomainSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const { subdomain, type, target } = parsed.data;

    // Check reserved names
    if (RESERVED_SUBDOMAINS.has(subdomain.toLowerCase())) {
      return NextResponse.json(
        { error: "예약된 서브도메인 이름입니다. 다른 이름을 사용해주세요." },
        { status: 409 }
      );
    }

    // Check uniqueness
    const existing = await db
      .prepare("SELECT id FROM subdomains WHERE subdomain = ? LIMIT 1")
      .bind(subdomain)
      .first();

    if (existing) {
      return NextResponse.json(
        { error: "이미 사용 중인 서브도메인입니다." },
        { status: 409 }
      );
    }

    // Check user's subdomain limit
    const countResult = await db
      .prepare("SELECT COUNT(*) as count FROM subdomains WHERE user_id = ?")
      .bind(user.id)
      .first<{ count: number }>();
    const count = countResult?.count ?? 0;

    const limits: Record<string, number> = { free: 0, pro: 3, business: 20 };
    const limit = limits[user.plan] ?? 0;

    if (count >= limit) {
      return NextResponse.json(
        { error: `현재 플랜에서 최대 ${limit}개의 서브도메인을 등록할 수 있습니다.` },
        { status: 403 }
      );
    }

    const subdomainId = generateId("sub");
    const now = Date.now();

    await db
      .prepare(
        `INSERT INTO subdomains (id, user_id, subdomain, type, target, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)`
      )
      .bind(subdomainId, user.id, subdomain, type, target, now)
      .run();

    return NextResponse.json(
      {
        id: subdomainId,
        subdomain,
        full_domain: `${subdomain}.krl.kr`,
        type,
        target,
        is_active: true,
        created_at: new Date(now).toISOString(),
        note: "DNS 레코드 전파까지 최대 24시간이 소요될 수 있습니다.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[/api/v1/subdomains POST] Error:", err);
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
        "SELECT id, subdomain, type, target, is_active, created_at FROM subdomains WHERE user_id = ? ORDER BY created_at DESC"
      )
      .bind(user.id)
      .all<Record<string, unknown>>();

    return NextResponse.json({ subdomains: result.results });
  } catch (err) {
    console.error("[/api/v1/subdomains GET] Error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
