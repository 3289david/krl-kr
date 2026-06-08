import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { createHash } from "crypto";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

// POST /api/v1/verify — hash a file and store record
export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const note = (formData.get("note") as string | null) ?? "";
    const isPublic = formData.get("isPublic") !== "false";

    if (!file) return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    if (file.size > 500 * 1024 * 1024) return NextResponse.json({ error: "파일 최대 500MB" }, { status: 413 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(buffer).digest("hex");

    const pool = await getPool();
    const id = nanoid(16);
    const now = Date.now();

    await pool.query(
      `INSERT INTO verify_records (id, user_id, file_name, file_size, mime_type, sha256, note, is_public, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, user.id, file.name, file.size, file.type || "application/octet-stream", sha256, note.trim(), isPublic, now]
    );

    return NextResponse.json({
      id,
      sha256,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      note: note.trim(),
      isPublic,
      createdAt: now,
      verifyUrl: `/verify/${id}`,
    }, { status: 201 });
  } catch (err) {
    console.error("[verify POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// GET /api/v1/verify — list my records
export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const r = await pool.query(
      `SELECT * FROM verify_records WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
      [user.id]
    );

    return NextResponse.json({ records: r.rows.map(row => ({
      id: row.id,
      fileName: row.file_name,
      fileSize: Number(row.file_size),
      mimeType: row.mime_type,
      sha256: row.sha256,
      note: row.note,
      isPublic: row.is_public,
      createdAt: Number(row.created_at),
    })) });
  } catch (err) {
    console.error("[verify GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
