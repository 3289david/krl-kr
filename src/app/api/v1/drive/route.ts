import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { checkStorageQuota, getStorageUsed, getUserPlan, getStorageLimit } from "@/lib/storage-quota";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const DRIVE_DIR = "/var/www/krl-kr/drive";

async function ensureTable() {
  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drive_files (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      parent_id INTEGER REFERENCES drive_files(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('file', 'folder')),
      mime_type TEXT,
      size BIGINT DEFAULT 0,
      storage_path TEXT,
      share_token TEXT UNIQUE,
      is_shared BOOLEAN DEFAULT FALSE,
      created_at BIGINT NOT NULL,
      updated_at BIGINT
    )
  `);
  return pool;
}


export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await ensureTable();
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parent");
    const search = searchParams.get("search");

    let query: string;
    let queryParams: unknown[];

    if (search) {
      query = "SELECT * FROM drive_files WHERE user_id = $1 AND name ILIKE $2 ORDER BY type DESC, name ASC";
      queryParams = [user.id, `%${search}%`];
    } else if (parentId) {
      query = "SELECT * FROM drive_files WHERE user_id = $1 AND parent_id = $2 ORDER BY type DESC, name ASC";
      queryParams = [user.id, parentId];
    } else {
      query = "SELECT * FROM drive_files WHERE user_id = $1 AND parent_id IS NULL ORDER BY type DESC, name ASC";
      queryParams = [user.id];
    }

    const result = await pool.query(query, queryParams);

    const [planRow, usedStorage] = await Promise.all([
      getUserPlan(pool, user.id),
      getStorageUsed(pool, user.id),
    ]);
    const maxStorage = getStorageLimit(planRow.plan, planRow.extra_storage_bytes, planRow.storage_override_bytes);

    return NextResponse.json({
      files: result.rows,
      storage: { used: usedStorage, max: maxStorage, plan: planRow.plan, extra_bytes: planRow.extra_storage_bytes },
    });
  } catch (err) {
    console.error("[drive GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await ensureTable();
    const contentType = request.headers.get("content-type") ?? "";

    // Create folder
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { name, parent_id } = body;
      if (!name) return NextResponse.json({ error: "폴더 이름을 입력해주세요." }, { status: 400 });

      const now = Date.now();
      const result = await pool.query(
        `INSERT INTO drive_files (user_id, parent_id, name, type, created_at, updated_at)
         VALUES ($1, $2, $3, 'folder', $4, $4) RETURNING *`,
        [user.id, parent_id ?? null, name, now]
      );
      return NextResponse.json({ file: result.rows[0] }, { status: 201 });
    }

    // Upload file
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const parentId = formData.get("parent_id")?.toString() ?? null;

      if (!file) return NextResponse.json({ error: "파일을 선택해주세요." }, { status: 400 });

      const quota = await checkStorageQuota(pool, user.id, file.size);
      if (!quota.ok) {
        return NextResponse.json({ error: "저장 공간이 부족합니다.", storage: quota }, { status: 413 });
      }

      const ext = file.name.split(".").pop() ?? "";
      const uuid = randomUUID();
      const storageName = ext ? `${uuid}.${ext}` : uuid;
      const userDir = path.join(DRIVE_DIR, String(user.id));
      fs.mkdirSync(userDir, { recursive: true });
      const storagePath = path.join(userDir, storageName);

      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(storagePath, buffer);

      const now = Date.now();
      const result = await pool.query(
        `INSERT INTO drive_files (user_id, parent_id, name, type, mime_type, size, storage_path, created_at, updated_at)
         VALUES ($1, $2, $3, 'file', $4, $5, $6, $7, $7) RETURNING *`,
        [user.id, parentId, file.name, file.type || "application/octet-stream", file.size, storagePath, now]
      );
      return NextResponse.json({ file: result.rows[0] }, { status: 201 });
    }

    return NextResponse.json({ error: "지원하지 않는 형식입니다." }, { status: 400 });
  } catch (err) {
    console.error("[drive POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
