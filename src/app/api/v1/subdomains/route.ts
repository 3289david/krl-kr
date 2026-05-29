import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import { verifyAltcha } from "@/lib/altcha";
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
    .min(1, "서브도메인을 입력해주세요.")
    .max(63, "서브도메인은 최대 63자까지 가능합니다.")
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
      "서브도메인은 소문자, 숫자, 하이픈(-)만 사용 가능하며 하이픈으로 시작/끝날 수 없습니다."
    ),
  type: z.enum(["github", "vercel", "html", "redirect", "api"]),
  target: z.string().min(1, "대상 URL을 입력해주세요."),
  altcha: z.string().nullable().optional(),
});

/**
 * Returns the correct CNAME target for each subdomain type.
 *
 * redirect / html / api → traffic must reach KRL.KR server → CNAME krl.kr
 * github               → CNAME to the user's github.io hostname
 * vercel               → CNAME to cname.vercel-dns.com (Vercel requirement)
 */
function getCnameTarget(type: string, target: string): { content: string; proxied: boolean } {
  switch (type) {
    case "github": {
      // target can be "username.github.io" or "https://username.github.io"
      try {
        const url = new URL(target.startsWith("http") ? target : `https://${target}`);
        return { content: url.hostname, proxied: true };
      } catch {
        // If it looks like a plain hostname, use as-is
        const host = target.split("/")[0];
        return { content: host || "krl.kr", proxied: true };
      }
    }
    case "vercel":
      // Vercel requires CNAME → cname.vercel-dns.com for custom subdomains
      return { content: "cname.vercel-dns.com", proxied: false };
    case "redirect":
    case "html":
    case "api":
    default:
      // These are all served / proxied by the KRL.KR VPS.
      // Traffic must hit our nginx → Next.js middleware → internal/sub handler.
      return { content: "krl.kr", proxied: true };
  }
}

export async function createCloudflareDnsRecord(
  subdomain: string,
  type: string,
  target: string
): Promise<{ recordId: string | null; error: string | null }> {
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!cfToken || !zoneId) {
    return { recordId: null, error: "Cloudflare API 미설정" };
  }

  const { content: cnameTarget, proxied } = getCnameTarget(type, target);

  try {
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
          proxied,
          ttl: 1,
        }),
      }
    );

    const data = await response.json() as {
      success: boolean;
      result?: { id: string };
      errors?: Array<{ message: string }>;
    };

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

export async function deleteCloudflareDnsRecord(recordId: string): Promise<void> {
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!cfToken || !zoneId) return;
  try {
    await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${cfToken}` } }
    );
  } catch { /* ignore */ }
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

    const { subdomain, type, target, altcha } = parsed.data;

    // 관리자 여부 확인 (관리자는 모든 제한 우회 가능)
    const { isAdmin: checkAdminFn } = await import("@/lib/admin");
    const adminBypass = await checkAdminFn(db, user.email);

    // 최소 길이 체크 (관리자 우회)
    if (!adminBypass && subdomain.length < 4) {
      return NextResponse.json(
        { error: "서브도메인은 최소 4자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // Altcha PoW verification (관리자 우회)
    if (!adminBypass) {
      const skipAltcha = process.env.SKIP_ALTCHA === "1";
      if (!skipAltcha) {
        const valid = await verifyAltcha(altcha);
        if (!valid) {
          return NextResponse.json(
            { error: "보안 인증을 완료해주세요.", code: "ALTCHA_FAILED" },
            { status: 400 }
          );
        }
      }
    }

    if (!adminBypass && RESERVED_SUBDOMAINS.has(subdomain.toLowerCase())) {
      return NextResponse.json(
        { error: "예약된 서브도메인 이름입니다. 다른 이름을 사용해주세요." },
        { status: 409 }
      );
    }

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

    const { recordId: cfDnsRecordId, error: cfError } = await createCloudflareDnsRecord(
      subdomain,
      type,
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

    const { content: cnameTarget } = getCnameTarget(type, target);

    return NextResponse.json(
      {
        id: subdomainId,
        subdomain,
        full_domain: `${subdomain}.krl.kr`,
        type,
        target,
        is_active: true,
        cf_configured: !!cfDnsRecordId,
        cname_target: cnameTarget,
        created_at: now,
        note: cfDnsRecordId
          ? "DNS 레코드가 생성되었습니다. 전파까지 최대 5분이 소요될 수 있습니다."
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
      subdomains: result.results.map((s) => {
        const { content: cnameTarget } = getCnameTarget(
          s.type as string,
          s.target as string
        );
        return {
          ...s,
          created_at: Number(s.created_at),
          is_active: Number(s.is_active),
          full_domain: `${s.subdomain}.krl.kr`,
          cf_configured: !!s.cf_dns_record_id,
          cname_target: cnameTarget,
        };
      }),
    });
  } catch (err) {
    console.error("[/api/v1/subdomains GET] Error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
