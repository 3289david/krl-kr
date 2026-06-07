import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();

    const r = await pool.query(
      `SELECT r.*, cm.role, cm.last_read_at
       FROM chat_rooms r
       JOIN chat_members cm ON cm.room_id = r.id AND cm.user_id = $2
       WHERE r.id = $1`,
      [id, user.id]
    );
    if (!r.rows[0]) return NextResponse.json({ error: "채팅방을 찾을 수 없습니다" }, { status: 404 });

    const members = await pool.query(
      `SELECT u.id, u.name, u.avatar_url, cm.role, cm.last_read_at, cm.joined_at
       FROM chat_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.room_id = $1
       ORDER BY cm.joined_at ASC`,
      [id]
    );

    const room = r.rows[0];
    return NextResponse.json({
      room: {
        id: Number(room.id),
        type: room.type,
        name: room.name,
        description: room.description,
        avatar: room.avatar,
        isPublic: room.is_public,
        ownerId: room.owner_id,
        inviteCode: room.invite_code,
        role: room.role,
        lastReadAt: Number(room.last_read_at ?? 0),
        createdAt: Number(room.created_at),
        updatedAt: Number(room.updated_at),
      },
      members: members.rows.map(m => ({
        id: m.id, name: m.name, avatar: m.avatar_url, role: m.role,
        lastReadAt: Number(m.last_read_at ?? 0), joinedAt: Number(m.joined_at),
      })),
    });
  } catch (err) {
    console.error("[chat/[id] GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const cm = await pool.query(
      "SELECT role FROM chat_members WHERE room_id=$1 AND user_id=$2",
      [id, user.id]
    );
    if (!cm.rows[0]) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    if (!["owner", "admin"].includes(cm.rows[0].role))
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });

    const body = await request.json();
    const { name, description, isPublic } = body;

    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (name !== undefined) { sets.push(`name=$${idx++}`); vals.push(name.trim()); }
    if (description !== undefined) { sets.push(`description=$${idx++}`); vals.push(description.trim()); }
    if (isPublic !== undefined) { sets.push(`is_public=$${idx++}`); vals.push(!!isPublic); }
    sets.push(`updated_at=$${idx++}`); vals.push(Date.now());
    vals.push(id);

    await pool.query(`UPDATE chat_rooms SET ${sets.join(",")} WHERE id=$${idx}`, vals);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[chat/[id] PATCH]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const cm = await pool.query(
      "SELECT role FROM chat_members WHERE room_id=$1 AND user_id=$2",
      [id, user.id]
    );
    if (!cm.rows[0]) return NextResponse.json({ error: "없음" }, { status: 404 });

    if (cm.rows[0].role === "owner") {
      await pool.query("DELETE FROM chat_rooms WHERE id=$1", [id]);
    } else {
      await pool.query("DELETE FROM chat_members WHERE room_id=$1 AND user_id=$2", [id, user.id]);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[chat/[id] DELETE]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
