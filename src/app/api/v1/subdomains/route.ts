import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import { z } from "zod";

const RESERVED_SUBDOMAINS = new Set([
  "www", "api", "mail", "app", "admin", "blog", "shop", "store", "dev",
  "staging", "prod", "beta", "alpha", "test", "demo", "cdn", "static",
  "assets", "media", "img", "images", "video", "docs", "help", "support",
  "status", "dashboard", "panel", "auth", "login", "register", "ftp",
  "ssh", "smtp", "imap", "pop", "ns1", "ns2", "cpanel", "webmail",
  "webhook", "webhooks", "krl", "kr", "krlkr",
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

async function createCloudflareCnameRecord(
  subdomain: string,
  target: string
): Promise<{ recordId: string | null; error: string | null }> {
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!cfToken || !zoneId) {
    return { recordId: null, error: "Cloudflare API 미설정" };
  }

  try {
    // Extract hostname for CNAME target
    let cnameTarget = target;
    try {
      const parsed = new URL(target);
      cnameTarget = parsed.hostname;
    } catch {
      // target might already be a hostname
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "CNAME",
          name: `${subdomain}.krl.kr`,
          content: cnameTarget,
          proxied: true,
          ttl: 1, // Auto TTL when proxied
        }),
      }
    );

    const data = await response.json() as { success: boolean; result?: { id: string }; errors?: Array<{ message: string }> };

    if (!data.success) {
      const errMsg = data.errors?.[0]?.message ?? "Unknown Cloudflare error";
      console.error(`[Subdomains] CF DNS API error: ${errMsg}`);
      return { recordId: null, error: errMsg };
    }

    return { recordId: data.result?.id ?? null, error: null };
  } catch (err) {
    console.error("[Subdomains] CF DNS API exception:", err);
    return { recordId: null, error: String(err) };
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);

    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const parsed = CreateSubdomainSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const { subdomain, type, target } = parsed.data;

    // Block reserved names
    if (RESERVED_SUBDOMAINS.has(subdomain.toLowerCase())) {
      return NextResponse.json(
        { error: "예약된 서브도메인 이름입니다. 다른 이름을 사용해주세요." },
        { status: 409 }
      );
    }

    // Block subdomains shorter than 4 chars (already enforced by schema, but double check)
    if (subdomain.length < 4) {
      return NextResponse.json(
        { error: "서브도메인은 최소 4자 이상이어야 합니다." },
        { status: 400 }
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

    const subdomainId = generateId("sub");
    const now = Date.now();

    // Create Cloudflare DNS CNAME record
    const { recordId: cfDnsRecordId, error: cfError } = await createCloudflareCnameRecord(
      subdomain,
      target
    );

    if (cfError) {
      console.warn(`[Subdomains] CF DNS creation warning for ${subdomain}: ${cfError}`);
    }

    await db
      .prepare(
        `INSERT INTO subdomains (id, user_id, subdomain, type, target, cf_dns_record_id, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
      )
      .bind(subdomainId, user.id, subdomain, type, target, cfDnsRecordId ?? null, now)
      .run();

    return NextResponse.json(
      {
        id: subdomainId,
        subdomain,
        full_domain: `${subdomain}.krl.kr`,
        type,
        target,
        is_active: true,
        cf_configured: !!cfDnsRecordId,
        created_at: new Date(now).toISOString(),
        note: cfDnsRecordId
          ? "DNS 레코드가 생성되었습니다. 전파까지 최대 24시간이 소요될 수 있습니다."
          : "서브도메인이 등록되었습니다. Cloudflare 설정 후 DNS 레코드가 생성됩니다.",
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

    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const result = await db
      .prepare(
        "SELECT id, subdomain, type, target, cf_dns_record_id, is_active, created_at FROM subdomains WHERE user_id = ? ORDER BY created_at DESC"
      )
      .bind(user.id)
      .all<Record<string, unknown>>();

    return NextResponse.json({
      subdomains: result.results.map((s) => ({
        ...s,
        full_domain: `${s.subdomain}.krl.kr`,
        cf_configured: !!s.cf_dns_record_id,
      })),
    });
  } catch (err) {
    console.error("[/api/v1/subdomains GET] Error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
