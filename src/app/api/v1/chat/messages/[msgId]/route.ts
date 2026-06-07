import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { publishToRoom } from "@/lib/chat";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ msgId: string }> }) {
  try {
    const { msgId } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const r = await pool.query(
      "SELECT * FROM chat_messages WHERE id=$1 AND deleted_at IS NULL",
      [msgId]
    );
    const msg = r.rows[0];
    if (!msg) return NextResponse.json({ error: "없음" }, { status: 404 });
    if (msg.user_id !== user.id) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

    const { content } = await request.json();
    if (!content?.trim()) return NextResponse.json({ error: "내용 필요" }, { status: 400 });

    const now = Date.now();
    await pool.query(
      "UPDATE chat_messages SET content=$1, edited_at=$2 WHERE id=$3",
      [content.trim(), now, msgId]
    );

    await publishToRoom(pool, Number(msg.room_id), {
      type: "edit",
      messageId: Number(msgId),
      roomId: Number(msg.room_id),
      content: content.trim(),
      editedAt: now,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[chat message PATCH]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ msgId: string }> }) {
  try {
    const { msgId } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const r = await pool.query(
      "SELECT * FROM chat_messages WHERE id=$1 AND deleted_at IS NULL",
      [msgId]
    );
    const msg = r.rows[0];
    if (!msg) return NextResponse.json({ error: "없음" }, { status: 404 });

    const isAdmin = await pool.query(
      "SELECT role FROM chat_members WHERE room_id=$1 AND user_id=$2",
      [msg.room_id, user.id]
    );
    const canDelete = msg.user_id === user.id || ["owner", "admin"].includes(isAdmin.rows[0]?.role);
    if (!canDelete) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

    const now = Date.now();
    await pool.query(
      "UPDATE chat_messages SET deleted_at=$1, content='' WHERE id=$2",
      [now, msgId]
    );

    await publishToRoom(pool, Number(msg.room_id), {
      type: "delete",
      messageId: Number(msgId),
      roomId: Number(msg.room_id),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[chat message DELETE]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
