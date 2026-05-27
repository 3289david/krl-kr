import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import {
  createCloudflareDnsRecord,
  deleteCloudflareDnsRecord,
} from "../../route";

/** POST /api/v1/subdomains/[id]/sync-dns — 강제 CF DNS 재동기화 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDB(request);

  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const sub = await db
    .prepare(
      "SELECT id, subdomain, type, target, cf_dns_record_id FROM subdomains WHERE id = ? AND user_id = ? LIMIT 1"
    )
    .bind(id, user.id)
    .first<{ id: string; subdomain: string; type: string; target: string; cf_dns_record_id: string | null }>();

  if (!sub) {
    return NextResponse.json({ error: "서브도메인을 찾을 수 없습니다." }, { status: 404 });
  }

  // Delete existing CF record (best-effort)
  if (sub.cf_dns_record_id) {
    await deleteCloudflareDnsRecord(sub.cf_dns_record_id);
  }

  // Re-create with correct CNAME target for the current type
  const { recordId, error: cfError } = await createCloudflareDnsRecord(
    sub.subdomain,
    sub.type,
    sub.target
  );

  if (cfError) {
    return NextResponse.json({ error: `Cloudflare DNS 오류: ${cfError}` }, { status: 502 });
  }

  await db
    .prepare("UPDATE subdomains SET cf_dns_record_id = ? WHERE id = ?")
    .bind(recordId, id)
    .run();

  return NextResponse.json({ success: true, cf_dns_record_id: recordId });
}
