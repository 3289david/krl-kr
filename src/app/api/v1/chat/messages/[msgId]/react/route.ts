import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { publishToRoom } from "@/lib/chat";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ msgId: string }> }) {
  try {
    const { msgId } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { emoji } = await request.json();
    if (!emoji) return NextResponse.json({ error: "이모지 필요" }, { status: 400 });

    const pool = await getPool();
    const msg = await pool.query(
      "SELECT room_id FROM chat_messages WHERE id=$1 AND deleted_at IS NULL",
      [msgId]
    );
    if (!msg.rows[0]) return NextResponse.json({ error: "없음" }, { status: 404 });

    // Toggle: try insert, if already exists delete
    const existing = await pool.query(
      "SELECT id FROM chat_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3",
      [msgId, user.id, emoji]
    );

    let added: boolean;
    if (existing.rows[0]) {
      await pool.query("DELETE FROM chat_reactions WHERE id=$1", [existing.rows[0].id]);
      added = false;
    } else {
      await pool.query(
        "INSERT INTO chat_reactions (message_id, user_id, emoji, created_at) VALUES ($1,$2,$3,$4)",
        [msgId, user.id, emoji, Date.now()]
      );
      added = true;
    }

    // Get updated counts
    const counts = await pool.query(
      `SELECT emoji, COUNT(*)::int AS cnt, BOOL_OR(user_id=$1) AS mine
       FROM chat_reactions WHERE message_id=$2 GROUP BY emoji`,
      [user.id, msgId]
    );
    const reactions = counts.rows.map(r => ({ emoji: r.emoji, count: r.cnt, mine: r.mine }));

    await publishToRoom(pool, Number(msg.rows[0].room_id), {
      type: "react",
      messageId: Number(msgId),
      roomId: Number(msg.rows[0].room_id),
      reactions,
      userId: user.id,
      emoji,
      added,
    });

    return NextResponse.json({ reactions });
  } catch (err) {
    console.error("[react POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
