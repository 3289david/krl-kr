import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { code, roomId } = await request.json();

    const pool = await getPool();
    let room: any;

    if (roomId) {
      // Join public room by ID
      const r = await pool.query("SELECT * FROM chat_rooms WHERE id=$1 AND is_public=true", [roomId]);
      if (!r.rows[0]) return NextResponse.json({ error: "공개 채팅방을 찾을 수 없습니다" }, { status: 404 });
      room = r.rows[0];
    } else {
      if (!code) return NextResponse.json({ error: "초대 코드 필요" }, { status: 400 });
      const r = await pool.query("SELECT * FROM chat_rooms WHERE invite_code=$1", [code]);
      if (!r.rows[0]) return NextResponse.json({ error: "유효하지 않은 코드" }, { status: 404 });
      room = r.rows[0];
    }
    await pool.query(
      "INSERT INTO chat_members (room_id, user_id, role, joined_at) VALUES ($1,$2,'member',$3) ON CONFLICT DO NOTHING",
      [room.id, user.id, Date.now()]
    );

    return NextResponse.json({ roomId: Number(room.id), name: room.name });
  } catch (err) {
    console.error("[chat/join]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
