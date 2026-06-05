/**
 * S3-Compatible API — Bucket operations
 * GET  /api/v1/s3/{bucket}         → ListObjectsV2
 * PUT  /api/v1/s3/{bucket}         → CreateBucket
 * DELETE /api/v1/s3/{bucket}       → DeleteBucket
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const DRIVE_DIR = "/var/www/krl-kr/drive";

async function resolveUser(request: NextRequest) {
  const db = getDB(request);
  const apiKey =
    request.headers.get("authorization")?.replace(/^Bearer\s*/i, "") ??
    request.nextUrl.searchParams.get("api_key") ??
    "";
  if (!apiKey) return null;
  return db
    .prepare("SELECT id, plan FROM users WHERE api_key = ? LIMIT 1")
    .bind(apiKey)
    .first<{ id: string; plan: string }>();
}

function xmlRes(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "application/xml", "Cache-Control": "no-store" },
  });
}

function escapeXml(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  const { bucket } = await params;
  const user = await resolveUser(request);
  if (!user) return xmlRes(`<?xml version="1.0"?><Error><Code>AccessDenied</Code><Message>Invalid API key</Message></Error>`, 403);

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  // Find bucket folder
  const bucketRow = await pool.query(
    `SELECT id FROM drive_files WHERE user_id=$1 AND name=$2 AND type='folder' AND parent_id IS NULL LIMIT 1`,
    [user.id, bucket]
  );
  if (!bucketRow.rows[0]) {
    return xmlRes(`<?xml version="1.0"?><Error><Code>NoSuchBucket</Code><Message>The specified bucket does not exist</Message></Error>`, 404);
  }

  const prefix = request.nextUrl.searchParams.get("prefix") ?? "";
  const maxKeys = Math.min(1000, parseInt(request.nextUrl.searchParams.get("max-keys") ?? "1000"));

  // List all files recursively under this bucket
  const files = await pool.query(
    `WITH RECURSIVE tree AS (
      SELECT id, name, type, size, mime_type, created_at, parent_id, name as key_path
      FROM drive_files WHERE parent_id=$1
      UNION ALL
      SELECT f.id, f.name, f.type, f.size, f.mime_type, f.created_at, f.parent_id,
        tree.key_path || '/' || f.name
      FROM drive_files f JOIN tree ON f.parent_id=tree.id
    )
    SELECT * FROM tree WHERE type='file' AND key_path LIKE $2 ORDER BY key_path LIMIT $3`,
    [bucketRow.rows[0].id, `${prefix}%`, maxKeys]
  );

  const contents = files.rows.map((f) => `
    <Contents>
      <Key>${escapeXml(f.key_path)}</Key>
      <LastModified>${new Date(Number(f.created_at)).toISOString()}</LastModified>
      <Size>${f.size ?? 0}</Size>
      <ContentType>${escapeXml(f.mime_type ?? "application/octet-stream")}</ContentType>
    </Contents>`).join("");

  return xmlRes(`<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult>
  <Name>${escapeXml(bucket)}</Name>
  <Prefix>${escapeXml(prefix)}</Prefix>
  <MaxKeys>${maxKeys}</MaxKeys>
  <IsTruncated>false</IsTruncated>
  ${contents}
</ListBucketResult>`);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  const { bucket } = await params;
  const user = await resolveUser(request);
  if (!user) return xmlRes(`<?xml version="1.0"?><Error><Code>AccessDenied</Code><Message>Invalid API key</Message></Error>`, 403);

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  const existing = await pool.query(
    `SELECT id FROM drive_files WHERE user_id=$1 AND name=$2 AND type='folder' AND parent_id IS NULL`,
    [user.id, bucket]
  );
  if (existing.rows[0]) {
    return xmlRes("", 200); // Already exists — idempotent
  }

  const now = Date.now();
  await pool.query(
    `INSERT INTO drive_files (user_id, name, type, created_at, updated_at) VALUES ($1,$2,'folder',$3,$3)`,
    [user.id, bucket, now]
  );

  // Create local directory
  const dir = path.join(DRIVE_DIR, user.id, bucket);
  fs.mkdirSync(dir, { recursive: true });

  return xmlRes("", 200);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  const { bucket } = await params;
  const user = await resolveUser(request);
  if (!user) return xmlRes(`<?xml version="1.0"?><Error><Code>AccessDenied</Code><Message>Invalid API key</Message></Error>`, 403);

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  // Check if bucket is empty
  const bucketRow = await pool.query(
    `SELECT id FROM drive_files WHERE user_id=$1 AND name=$2 AND type='folder' AND parent_id IS NULL`,
    [user.id, bucket]
  );
  if (!bucketRow.rows[0]) {
    return xmlRes(`<?xml version="1.0"?><Error><Code>NoSuchBucket</Code><Message>The specified bucket does not exist</Message></Error>`, 404);
  }

  const children = await pool.query(`SELECT id FROM drive_files WHERE parent_id=$1 LIMIT 1`, [bucketRow.rows[0].id]);
  if (children.rows.length > 0) {
    return xmlRes(`<?xml version="1.0"?><Error><Code>BucketNotEmpty</Code><Message>The bucket you tried to delete is not empty</Message></Error>`, 409);
  }

  await pool.query(`DELETE FROM drive_files WHERE id=$1`, [bucketRow.rows[0].id]);
  const dir = path.join(DRIVE_DIR, user.id, bucket);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });

  return xmlRes("", 204);
}
