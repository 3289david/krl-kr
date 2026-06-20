import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { checkStorageQuota, getStorageUsed, getUserPlan, getStorageLimit } from "@/lib/storage-quota";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { isVideo, queueHls } from "@/lib/hls";

export const runtime = "nodejs";

export const DRIVE_DIR = "/var/www/krl-kr/drive";

export async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parent");
    const search = searchParams.get("search");
    const view = searchParams.get("view"); // "starred" | "trash" | "recent"
    const sort = searchParams.get("sort") ?? "name";
    const order = searchParams.get("order") ?? "asc";

    const sortCol = ["name", "size", "created_at", "updated_at"].includes(sort) ? sort : "name";
    const sortDir = order === "desc" ? "DESC" : "ASC";
    // Folders always first
    const orderClause = `ORDER BY type DESC, ${sortCol} ${sortDir}`;

    let query: string;
    let queryParams: unknown[];

    if (view === "starred") {
      query = `SELECT * FROM drive_files WHERE user_id=$1 AND is_starred=TRUE AND deleted_at IS NULL ${orderClause}`;
      queryParams = [user.id];
    } else if (view === "trash") {
      query = `SELECT * FROM drive_files WHERE user_id=$1 AND deleted_at IS NOT NULL ${orderClause}`;
      queryParams = [user.id];
    } else if (view === "recent") {
      query = `SELECT * FROM drive_files WHERE user_id=$1 AND type='file' AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 50`;
      queryParams = [user.id];
    } else if (search) {
      query = `SELECT * FROM drive_files WHERE user_id=$1 AND name ILIKE $2 AND deleted_at IS NULL ${orderClause}`;
      queryParams = [user.id, `%${search}%`];
    } else if (parentId) {
      query = `SELECT * FROM drive_files WHERE user_id=$1 AND parent_id=$2 AND deleted_at IS NULL ${orderClause}`;
      queryParams = [user.id, parentId];
    } else {
      query = `SELECT * FROM drive_files WHERE user_id=$1 AND parent_id IS NULL AND deleted_at IS NULL ${orderClause}`;
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

    const pool = await getPool();
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { name, parent_id, action, ids, target_id } = body as Record<string, unknown>;

      // Bulk delete (to trash)
      if (action === "bulk_trash" && Array.isArray(ids)) {
        await pool.query(
          `UPDATE drive_files SET deleted_at=$1 WHERE user_id=$2 AND id=ANY($3::int[])`,
          [Date.now(), user.id, ids]
        );
        return NextResponse.json({ success: true });
      }

      // Bulk move
      if (action === "bulk_move" && Array.isArray(ids)) {
        await pool.query(
          `UPDATE drive_files SET parent_id=$1, updated_at=$2 WHERE user_id=$3 AND id=ANY($4::int[])`,
          [target_id ?? null, Date.now(), user.id, ids]
        );
        return NextResponse.json({ success: true });
      }

      // Empty trash
      if (action === "empty_trash") {
        const trashed = await pool.query(
          "SELECT storage_path FROM drive_files WHERE user_id=$1 AND deleted_at IS NOT NULL AND type='file'",
          [user.id]
        );
        for (const row of trashed.rows) {
          if (row.storage_path) try { fs.unlinkSync(row.storage_path); } catch {}
        }
        await pool.query("DELETE FROM drive_files WHERE user_id=$1 AND deleted_at IS NOT NULL", [user.id]);
        return NextResponse.json({ success: true });
      }

      // Create folder
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
      const driveFile = result.rows[0];

      // Queue HLS for video files immediately after upload
      if (isVideo(file.type)) {
        queueHls(storagePath, `drive_${driveFile.id}`);
      }

      return NextResponse.json({ file: driveFile }, { status: 201 });
    }

    return NextResponse.json({ error: "지원하지 않는 형식입니다." }, { status: 400 });
  } catch (err) {
    console.error("[drive POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
