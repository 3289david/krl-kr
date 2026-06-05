/**
 * S3-Compatible API — ListBuckets
 * GET /api/v1/s3
 *
 * Auth: Authorization: Bearer <api_key>  OR  ?api_key=<key>
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

async function resolveUser(request: NextRequest) {
  const db = getDB(request);
  const apiKey =
    request.headers.get("authorization")?.replace(/^Bearer\s*/i, "") ??
    request.nextUrl.searchParams.get("api_key") ??
    "";
  if (!apiKey) return null;
  const user = await db
    .prepare("SELECT id, plan FROM users WHERE api_key = ? LIMIT 1")
    .bind(apiKey)
    .first<{ id: string; plan: string }>();
  return user;
}

function xmlResponse(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "application/xml", "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return xmlResponse(`<?xml version="1.0"?><Error><Code>AccessDenied</Code><Message>Invalid API key</Message></Error>`, 403);
  }

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  // Each user's top-level drive folders = buckets
  const rows = await pool.query(
    `SELECT name, created_at FROM drive_files WHERE user_id=$1 AND type='folder' AND parent_id IS NULL ORDER BY created_at`,
    [user.id]
  );

  const buckets = rows.rows.map((r) => `
    <Bucket>
      <Name>${escapeXml(r.name)}</Name>
      <CreationDate>${new Date(Number(r.created_at)).toISOString()}</CreationDate>
    </Bucket>`).join("");

  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<ListAllMyBucketsResult>
  <Owner><ID>${escapeXml(user.id)}</ID></Owner>
  <Buckets>${buckets}</Buckets>
</ListAllMyBucketsResult>`);
}

function escapeXml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
