import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const UpdateSchema = z.object({
  target: z.string().min(1).optional(),
  type: z.enum(["github", "vercel", "html", "redirect", "api"]).optional(),
  is_active: z.boolean().optional(),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDB(request);

  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  // Fetch the record first to get the CF DNS record ID
  const sub = await db
    .prepare("SELECT id, cf_dns_record_id FROM subdomains WHERE id = ? AND user_id = ? LIMIT 1")
    .bind(id, user.id)
    .first<{ id: string; cf_dns_record_id: string | null }>();

  if (!sub) {
    return NextResponse.json({ error: "서브도메인을 찾을 수 없습니다." }, { status: 404 });
  }

  // Delete from Cloudflare DNS (best-effort)
  if (sub.cf_dns_record_id) {
    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    if (cfToken && zoneId) {
      try {
        await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${sub.cf_dns_record_id}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${cfToken}` } }
        );
      } catch { /* ignore CF errors */ }
    }
  }

  await db
    .prepare("DELETE FROM subdomains WHERE id = ? AND user_id = ?")
    .bind(id, user.id)
    .run();

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDB(request);

  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const existing = await db
    .prepare("SELECT id FROM subdomains WHERE id = ? AND user_id = ? LIMIT 1")
    .bind(id, user.id)
    .first();

  if (!existing) {
    return NextResponse.json({ error: "서브도메인을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await request.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const data = parsed.data;
  const updates: Record<string, unknown> = {};
  if (data.target !== undefined) updates.target = data.target;
  if (data.type !== undefined) updates.type = data.type;
  if (data.is_active !== undefined) updates.is_active = data.is_active ? 1 : 0;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "업데이트할 항목이 없습니다." }, { status: 400 });
  }

  const fields = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
  const values = Object.values(updates);

  await db
    .prepare(`UPDATE subdomains SET ${fields} WHERE id = ?`)
    .bind(...values, id)
    .run();

  const updated = await db
    .prepare("SELECT * FROM subdomains WHERE id = ? LIMIT 1")
    .bind(id)
    .first<Record<string, unknown>>();

  return NextResponse.json({ subdomain: updated });
}
