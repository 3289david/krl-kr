/**
 * S3-Compatible API — Object operations
 * PUT    /api/v1/s3/{bucket}/{key+}  → PutObject
 * GET    /api/v1/s3/{bucket}/{key+}  → GetObject
 * DELETE /api/v1/s3/{bucket}/{key+}  → DeleteObject
 * HEAD   /api/v1/s3/{bucket}/{key+}  → HeadObject
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const DRIVE_DIR = "/var/www/krl-kr/drive";

const PLAN_STORAGE: Record<string, number> = {
  free: 5 * 1024 * 1024 * 1024,
  pro: 20 * 1024 * 1024 * 1024,
  vip: 100 * 1024 * 1024 * 1024,
};

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

function xmlErr(code: string, msg: string, status: number) {
  return new NextResponse(`<?xml version="1.0"?><Error><Code>${code}</Code><Message>${msg}</Message></Error>`, {
    status,
    headers: { "Content-Type": "application/xml" },
  });
}

function escapeXml(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function getBucketRow(pool: import("pg").Pool, userId: string, bucket: string) {
  const res = await pool.query(
    `SELECT id FROM drive_files WHERE user_id=$1 AND name=$2 AND type='folder' AND parent_id IS NULL LIMIT 1`,
    [userId, bucket]
  );
  return res.rows[0] ?? null;
}

async function getOrCreateFolder(pool: import("pg").Pool, userId: string, parentId: number, name: string): Promise<number> {
  const ex = await pool.query(
    `SELECT id FROM drive_files WHERE parent_id=$1 AND name=$2 AND type='folder' LIMIT 1`,
    [parentId, name]
  );
  if (ex.rows[0]) return ex.rows[0].id;
  const ins = await pool.query(
    `INSERT INTO drive_files (user_id, parent_id, name, type, created_at, updated_at) VALUES ($1,$2,$3,'folder',$4,$4) RETURNING id`,
    [userId, parentId, name, Date.now()]
  );
  return ins.rows[0].id;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ bucket: string; key: string[] }> }) {
  const { bucket, key: keyParts } = await params;
  const user = await resolveUser(request);
  if (!user) return xmlErr("AccessDenied", "Invalid API key", 403);

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  const bucketRow = await getBucketRow(pool, user.id, bucket);
  if (!bucketRow) return xmlErr("NoSuchBucket", "The specified bucket does not exist", 404);

  const keyStr = keyParts.join("/");
  const fileName = keyParts[keyParts.length - 1];
  const dirParts = keyParts.slice(0, -1);

  // Check storage quota
  const storageLimit = PLAN_STORAGE[user.plan as string] ?? PLAN_STORAGE.free;
  const usedRes = await pool.query(`SELECT COALESCE(SUM(size),0) as total FROM drive_files WHERE user_id=$1 AND type='file'`, [user.id]);
  const usedBytes = parseInt(usedRes.rows[0]?.total ?? "0");
  const contentLength = parseInt(request.headers.get("content-length") ?? "0");
  if (usedBytes + contentLength > storageLimit) {
    return xmlErr("QuotaExceeded", "Storage quota exceeded", 507);
  }

  // Traverse/create nested folders
  let parentId = bucketRow.id;
  for (const part of dirParts) {
    parentId = await getOrCreateFolder(pool, user.id, parentId, part);
  }

  // Read body
  const buf = Buffer.from(await request.arrayBuffer());
  const mimeType = request.headers.get("content-type") ?? "application/octet-stream";
  const fileSize = buf.byteLength;

  // Write to filesystem
  const storagePath = path.join(user.id, bucket, keyStr);
  const absPath = path.join(DRIVE_DIR, storagePath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, buf);

  // Upsert DB record
  const existing = await pool.query(
    `SELECT id FROM drive_files WHERE parent_id=$1 AND name=$2 AND type='file' LIMIT 1`,
    [parentId, fileName]
  );

  const now = Date.now();
  if (existing.rows[0]) {
    await pool.query(
      `UPDATE drive_files SET size=$1, mime_type=$2, storage_path=$3, updated_at=$4 WHERE id=$5`,
      [fileSize, mimeType, storagePath, now, existing.rows[0].id]
    );
  } else {
    await pool.query(
      `INSERT INTO drive_files (user_id, parent_id, name, type, mime_type, size, storage_path, created_at, updated_at) VALUES ($1,$2,$3,'file',$4,$5,$6,$7,$7)`,
      [user.id, parentId, fileName, mimeType, fileSize, storagePath, now]
    );
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      "ETag": `"${randomUUID()}"`,
      "x-amz-request-id": randomUUID(),
    },
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ bucket: string; key: string[] }> }) {
  const { bucket, key: keyParts } = await params;
  const user = await resolveUser(request);
  if (!user) return xmlErr("AccessDenied", "Invalid API key", 403);

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  const bucketRow = await getBucketRow(pool, user.id, bucket);
  if (!bucketRow) return xmlErr("NoSuchBucket", "The specified bucket does not exist", 404);

  const keyStr = keyParts.join("/");
  const absPath = path.join(DRIVE_DIR, user.id, bucket, keyStr);

  if (!fs.existsSync(absPath)) {
    return xmlErr("NoSuchKey", "The specified key does not exist", 404);
  }

  const stat = fs.statSync(absPath);
  const fileRow = await pool.query(
    `SELECT mime_type FROM drive_files WHERE storage_path=$1 LIMIT 1`,
    [path.join(user.id, bucket, keyStr)]
  );
  const mimeType = fileRow.rows[0]?.mime_type ?? "application/octet-stream";

  const buf = fs.readFileSync(absPath);
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(stat.size),
      "Last-Modified": stat.mtime.toUTCString(),
    },
  });
}

export async function HEAD(request: NextRequest, { params }: { params: Promise<{ bucket: string; key: string[] }> }) {
  const { bucket, key: keyParts } = await params;
  const user = await resolveUser(request);
  if (!user) return xmlErr("AccessDenied", "Invalid API key", 403);

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  const bucketRow = await getBucketRow(pool, user.id, bucket);
  if (!bucketRow) return xmlErr("NoSuchBucket", "The specified bucket does not exist", 404);

  const keyStr = keyParts.join("/");
  const absPath = path.join(DRIVE_DIR, user.id, bucket, keyStr);

  if (!fs.existsSync(absPath)) return xmlErr("NoSuchKey", "The specified key does not exist", 404);

  const stat = fs.statSync(absPath);
  const fileRow = await pool.query(`SELECT mime_type FROM drive_files WHERE storage_path=$1 LIMIT 1`, [path.join(user.id, bucket, keyStr)]);

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": fileRow.rows[0]?.mime_type ?? "application/octet-stream",
      "Content-Length": String(stat.size),
      "Last-Modified": stat.mtime.toUTCString(),
    },
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ bucket: string; key: string[] }> }) {
  const { bucket, key: keyParts } = await params;
  const user = await resolveUser(request);
  if (!user) return xmlErr("AccessDenied", "Invalid API key", 403);

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  const bucketRow = await getBucketRow(pool, user.id, bucket);
  if (!bucketRow) return xmlErr("NoSuchBucket", "The specified bucket does not exist", 404);

  const keyStr = keyParts.join("/");
  const storagePath = path.join(user.id, bucket, keyStr);
  const absPath = path.join(DRIVE_DIR, storagePath);

  await pool.query(`DELETE FROM drive_files WHERE storage_path=$1 AND user_id=$2`, [storagePath, user.id]);
  if (fs.existsSync(absPath)) fs.unlinkSync(absPath);

  return new NextResponse(null, { status: 204 });
}
