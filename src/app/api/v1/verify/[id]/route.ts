import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

function fmt(row: any) {
  return {
    id: row.id,
    fileName: row.file_name,
    fileSize: Number(row.file_size),
    mimeType: row.mime_type,
    sha256: row.sha256,
    note: row.note,
    isPublic: row.is_public,
    createdAt: Number(row.created_at),
    ownerName: row.owner_name ?? null,
  };
}

// GET /api/v1/verify/[id] — public record lookup
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pool = await getPool();
    const r = await pool.query(
      `SELECT v.*, u.name AS owner_name FROM verify_records v
       LEFT JOIN users u ON u.id = v.user_id
       WHERE v.id=$1 AND v.is_public=true`,
      [id]
    );
    if (!r.rows[0]) return NextResponse.json({ error: "찾을 수 없습니다" }, { status: 404 });
    return NextResponse.json({ record: fmt(r.rows[0]) });
  } catch (err) {
    console.error("[verify GET id]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// POST /api/v1/verify/[id] — check file against stored hash
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pool = await getPool();
    const r = await pool.query("SELECT * FROM verify_records WHERE id=$1", [id]);
    if (!r.rows[0]) return NextResponse.json({ error: "찾을 수 없습니다" }, { status: 404 });
    const record = r.rows[0];

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    if (file.size > 500 * 1024 * 1024) return NextResponse.json({ error: "파일 최대 500MB" }, { status: 413 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const match = sha256 === record.sha256;

    return NextResponse.json({
      match,
      uploaded: { sha256, fileName: file.name, fileSize: file.size },
      original: fmt(record),
    });
  } catch (err) {
    console.error("[verify POST id]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// DELETE /api/v1/verify/[id] — owner can delete
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { requireAuth } = await import("@/lib/auth");
    const { getDB } = await import("@/lib/env");
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const r = await pool.query("DELETE FROM verify_records WHERE id=$1 AND user_id=$2 RETURNING id", [id, user.id]);
    if (!r.rows[0]) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[verify DELETE id]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
