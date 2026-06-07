import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

// GET or create a DM room between current user and target userId
export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { userId } = await request.json();
    if (!userId || userId === user.id)
      return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

    const pool = await getPool();

    // Check target user exists
    const target = await pool.query("SELECT id, name, avatar_url FROM users WHERE id=$1", [userId]);
    if (!target.rows[0]) return NextResponse.json({ error: "사용자 없음" }, { status: 404 });

    // Find existing DM
    const existing = await pool.query(
      `SELECT r.id FROM chat_rooms r
       JOIN chat_members m1 ON m1.room_id = r.id AND m1.user_id = $1
       JOIN chat_members m2 ON m2.room_id = r.id AND m2.user_id = $2
       WHERE r.type = 'direct'
       LIMIT 1`,
      [user.id, userId]
    );

    if (existing.rows[0]) {
      return NextResponse.json({ roomId: Number(existing.rows[0].id), created: false });
    }

    // Create new DM
    const now = Date.now();
    const r = await pool.query(
      "INSERT INTO chat_rooms (type, owner_id, created_at, updated_at) VALUES ('direct',$1,$2,$2) RETURNING id",
      [user.id, now]
    );
    const roomId = r.rows[0].id;

    await pool.query(
      "INSERT INTO chat_members (room_id, user_id, role, joined_at) VALUES ($1,$2,'member',$3),($1,$4,'member',$3)",
      [roomId, user.id, now, userId]
    );

    return NextResponse.json({ roomId: Number(roomId), created: true }, { status: 201 });
  } catch (err) {
    console.error("[chat/dm POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
