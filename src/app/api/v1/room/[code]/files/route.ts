import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { isVideo, queueHls } from "@/lib/hls";

export const runtime = "nodejs";

const UPLOAD_DIR = "/var/www/krl-kr/uploads/rooms";
const MAX_SIZE = 100 * 1024 * 1024;

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

// GET /api/v1/room/[code]/files
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const pool = await getPool();
    const r = await pool.query(
      "SELECT * FROM krl_room_files WHERE room_code=$1 ORDER BY created_at DESC",
      [code]
    );
    return NextResponse.json({ files: r.rows.map((f: any) => ({
      id: Number(f.id),
      name: f.name,
      mimeType: f.mime_type,
      size: Number(f.size),
      url: f.url,
      uploaderName: f.uploader_name,
      userId: f.user_id,
      createdAt: Number(f.created_at),
    })) });
  } catch (err) {
    console.error("[room files GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// POST /api/v1/room/[code]/files — upload file to room
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const pool = await getPool();
    const room = await pool.query("SELECT * FROM krl_rooms WHERE code=$1 AND archived_at IS NULL", [code]);
    if (!room.rows[0]) return NextResponse.json({ error: "방을 찾을 수 없습니다" }, { status: 404 });

    // Try to identify user
    let userId: string | null = null;
    let uploaderName = "Guest";
    try {
      const { requireAuth } = await import("@/lib/auth");
      const { getDB } = await import("@/lib/env");
      const db = getDB(request);
      const { user } = await requireAuth(db, request);
      if (user) {
        const u = await pool.query("SELECT name FROM users WHERE id=$1", [user.id]);
        userId = user.id;
        uploaderName = u.rows[0]?.name ?? "User";
      }
    } catch {}

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const guestId = (formData.get("guestId") as string | null) ?? null;
    const guestName = (formData.get("guestName") as string | null) ?? "Guest";
    if (!userId) uploaderName = guestName.slice(0, 30);

    if (!file) return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "파일 최대 100MB" }, { status: 413 });

    const ext = path.extname(file.name).toLowerCase() || "";
    const uuid = randomUUID();
    const dir = path.join(UPLOAD_DIR, code);
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${uuid}${ext}`;
    const filePath = path.join(dir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/rooms/${code}/${filename}`;
    const now = Date.now();

    const r = await pool.query(
      `INSERT INTO krl_room_files (room_code, user_id, guest_id, uploader_name, name, mime_type, size, url, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [code, userId, guestId, uploaderName, file.name, file.type || "application/octet-stream", file.size, url, now]
    );
    const roomFileId = r.rows[0].id;

    // Queue HLS transcoding for video files (use DB id as key)
    const mimeType = file.type || "application/octet-stream";
    if (isVideo(mimeType)) {
      queueHls(filePath, `room_${roomFileId}`);
    }

    // If logged-in, also add to their Drive
    if (userId) {
      pool.query(
        `INSERT INTO drive_files (user_id, name, type, mime_type, size, storage_path, created_at, updated_at)
         VALUES ($1,$2,'file',$3,$4,$5,$6,$6)`,
        [userId, file.name, file.type || "application/octet-stream", file.size, filePath, now]
      ).catch(() => {});
    }

    await pool.query("UPDATE krl_rooms SET last_active_at=$1 WHERE code=$2", [now, code]);

    const fileObj = {
      id: Number(roomFileId),
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      url,
      uploaderName,
      userId,
      createdAt: now,
    };

    try {
      const redis = getRedis();
      redis.publish(`krl_room:${code}`, JSON.stringify({ type: "file", data: fileObj }));
    } catch {}

    return NextResponse.json({ file: fileObj }, { status: 201 });
  } catch (err) {
    console.error("[room files POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
