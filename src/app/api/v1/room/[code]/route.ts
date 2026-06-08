import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ARCHIVE_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

// GET /api/v1/room/[code] — room info + note + member count
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const pool = await getPool();

    const r = await pool.query(
      `SELECT r.*, n.content AS note_content, n.updated_at AS note_updated_at,
        u.name AS owner_name
       FROM krl_rooms r
       LEFT JOIN krl_room_notes n ON n.room_code = r.code
       LEFT JOIN users u ON u.id = r.owner_id
       WHERE r.code=$1`,
      [code]
    );
    if (!r.rows[0]) return NextResponse.json({ error: "방을 찾을 수 없습니다" }, { status: 404 });
    const room = r.rows[0];

    // Auto-archive if inactive > 7 days
    if (!room.archived_at && Date.now() - Number(room.last_active_at) > ARCHIVE_AFTER_MS) {
      await pool.query("UPDATE krl_rooms SET archived_at=$1 WHERE code=$2", [Date.now(), code]);
      room.archived_at = Date.now();
    }

    const fileCount = await pool.query("SELECT COUNT(*)::int AS c FROM krl_room_files WHERE room_code=$1", [code]);
    const msgCount = await pool.query("SELECT COUNT(*)::int AS c FROM krl_room_messages WHERE room_code=$1", [code]);

    return NextResponse.json({
      code: room.code,
      name: room.name,
      ownerName: room.owner_name ?? null,
      archivedAt: room.archived_at ? Number(room.archived_at) : null,
      createdAt: Number(room.created_at),
      lastActiveAt: Number(room.last_active_at),
      note: room.note_content ?? "",
      noteUpdatedAt: room.note_updated_at ? Number(room.note_updated_at) : null,
      fileCount: fileCount.rows[0]?.c ?? 0,
      messageCount: msgCount.rows[0]?.c ?? 0,
    });
  } catch (err) {
    console.error("[room GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
