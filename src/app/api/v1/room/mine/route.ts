import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;
    const pool = await getPool();
    const r = await pool.query(
      `SELECT r.*,
        (SELECT COUNT(*)::int FROM krl_room_messages m WHERE m.room_code=r.code) AS msg_count,
        (SELECT COUNT(*)::int FROM krl_room_files f WHERE f.room_code=r.code) AS file_count
       FROM krl_rooms r WHERE r.owner_id=$1 ORDER BY r.last_active_at DESC LIMIT 50`,
      [user.id]
    );
    return NextResponse.json({ rooms: r.rows.map(row => ({
      code: row.code, name: row.name, archivedAt: row.archived_at ? Number(row.archived_at) : null,
      createdAt: Number(row.created_at), lastActiveAt: Number(row.last_active_at),
      msgCount: row.msg_count, fileCount: row.file_count,
    })) });
  } catch (err) {
    console.error("[room mine]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
