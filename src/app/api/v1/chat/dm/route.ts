import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

// GET or create a DM room between current user and target user
export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    let { userId, username } = body;

    const pool = await getPool();

    // Resolve target user ID from username/discriminator
    if (!userId && username) {
      // Strip leading @ and parse username#DISC
      const raw = String(username).replace(/^@/, "").trim();
      const hashIdx = raw.indexOf("#");
      if (hashIdx !== -1) {
        const uname = raw.slice(0, hashIdx);
        const disc = raw.slice(hashIdx + 1).toUpperCase();
        const q = await pool.query(
          "SELECT id FROM users WHERE username=$1 AND discriminator=$2",
          [uname, disc]
        );
        if (!q.rows[0]) return NextResponse.json({ error: `@${uname}#${disc} 사용자를 찾을 수 없습니다` }, { status: 404 });
        userId = q.rows[0].id;
      } else {
        const q = await pool.query("SELECT id FROM users WHERE username=$1 LIMIT 1", [raw]);
        if (!q.rows[0]) return NextResponse.json({ error: `@${raw} 사용자를 찾을 수 없습니다. 구분자(#)를 포함한 전체 ID를 입력하세요.` }, { status: 404 });
        userId = q.rows[0].id;
      }
    } else if (userId && username && !userId.includes("-")) {
      // userId looks like a username, not a UUID — try resolving by ID first, then username
      const q = await pool.query("SELECT id FROM users WHERE id=$1", [userId]);
      if (!q.rows[0]) {
        const q2 = await pool.query("SELECT id FROM users WHERE username=$1 LIMIT 1", [username.replace(/^@/, "")]);
        if (!q2.rows[0]) return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
        userId = q2.rows[0].id;
      }
    }

    if (!userId || userId === user.id)
      return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

    // Verify target user exists
    const target = await pool.query("SELECT id FROM users WHERE id=$1", [userId]);
    if (!target.rows[0]) return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });

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
