import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

async function broadcastToRoom(pool: any, roomId: number, userId: string, event: object) {
  const redis = getRedis();
  const members = await pool.query(
    "SELECT user_id FROM voice_room_members WHERE room_id=$1 AND user_id!=$2",
    [roomId, userId]
  );
  const payload = JSON.stringify(event);
  for (const m of members.rows) {
    redis.publish(`chat:${m.user_id}`, payload).catch(() => {});
  }
}

// GET: room info + members
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const r = await pool.query("SELECT * FROM voice_rooms WHERE id=$1", [id]);
    if (!r.rows[0]) return NextResponse.json({ error: "없음" }, { status: 404 });

    const members = await pool.query(
      `SELECT m.*, u.name, u.username, u.avatar_url
       FROM voice_room_members m JOIN users u ON u.id=m.user_id
       WHERE m.room_id=$1`,
      [id]
    );

    const room = r.rows[0];
    return NextResponse.json({
      room: {
        id: Number(room.id), name: room.name, description: room.description,
        isPublic: room.is_public, isTemporary: room.is_temporary, stageMode: room.stage_mode,
        ownerId: room.owner_id, quickCode: room.quick_code,
        expiresAt: room.expires_at ? Number(room.expires_at) : null,
        createdAt: Number(room.created_at),
      },
      members: members.rows.map(m => ({
        userId: m.user_id, name: m.name, username: m.username, avatar: m.avatar_url,
        role: m.role, isMuted: m.is_muted, screenSharing: m.screen_sharing,
        joinedAt: Number(m.joined_at),
      })),
      myRole: members.rows.find(m => m.user_id === user.id)?.role ?? null,
    });
  } catch (err) {
    console.error("[voice/:id GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// POST: join room
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const room = await pool.query("SELECT * FROM voice_rooms WHERE id=$1", [id]);
    if (!room.rows[0]) return NextResponse.json({ error: "없음" }, { status: 404 });

    const max = room.rows[0].max_participants ?? 20;
    const count = await pool.query("SELECT COUNT(*) AS c FROM voice_room_members WHERE room_id=$1", [id]);
    if (parseInt(count.rows[0].c) >= max) {
      return NextResponse.json({ error: "방이 꽉 찼습니다" }, { status: 400 });
    }

    const now = Date.now();
    const isOwner = room.rows[0].owner_id === user.id;
    const isStage = room.rows[0].stage_mode;
    const role = isOwner ? "host" : (isStage ? "listener" : "speaker");

    await pool.query(
      `INSERT INTO voice_room_members (room_id, user_id, role, joined_at)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (room_id, user_id) DO UPDATE SET role=EXCLUDED.role, joined_at=EXCLUDED.joined_at`,
      [id, user.id, role, now]
    );

    const userRow = await pool.query("SELECT name, username, avatar_url FROM users WHERE id=$1", [user.id]);
    const u = userRow.rows[0];

    // Get current members (for new joiner to initiate offers)
    const existingMembers = await pool.query(
      "SELECT user_id FROM voice_room_members WHERE room_id=$1 AND user_id!=$2",
      [id, user.id]
    );

    // Notify existing members
    await broadcastToRoom(pool, Number(id), user.id, {
      type: "voice_join",
      roomId: Number(id),
      user: { id: user.id, name: u?.name, username: u?.username, avatar: u?.avatar_url, role, isMuted: false },
    });

    return NextResponse.json({
      joined: true,
      role,
      members: existingMembers.rows.map(m => m.user_id),
    });
  } catch (err) {
    console.error("[voice/:id POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// DELETE: leave room
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    await pool.query("DELETE FROM voice_room_members WHERE room_id=$1 AND user_id=$2", [id, user.id]);

    await broadcastToRoom(pool, Number(id), user.id, {
      type: "voice_leave",
      roomId: Number(id),
      userId: user.id,
    });

    // If owner left and room is temporary, delete it
    const room = await pool.query("SELECT * FROM voice_rooms WHERE id=$1", [id]);
    const remaining = await pool.query("SELECT COUNT(*) AS c FROM voice_room_members WHERE room_id=$1", [id]);
    if (parseInt(remaining.rows[0].c) === 0 && room.rows[0]?.is_temporary) {
      await pool.query("DELETE FROM voice_rooms WHERE id=$1", [id]);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[voice/:id DELETE]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// PATCH: update mute/screen-share state
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { isMuted, screenSharing } = await request.json();
    const pool = await getPool();

    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (isMuted !== undefined) { sets.push(`is_muted=$${idx++}`); vals.push(isMuted); }
    if (screenSharing !== undefined) { sets.push(`screen_sharing=$${idx++}`); vals.push(screenSharing); }
    if (!sets.length) return NextResponse.json({ ok: true });

    vals.push(id); vals.push(user.id);
    await pool.query(
      `UPDATE voice_room_members SET ${sets.join(",")} WHERE room_id=$${idx} AND user_id=$${idx+1}`,
      vals
    );

    await broadcastToRoom(pool, Number(id), "nobody", {
      type: "voice_state",
      roomId: Number(id),
      userId: user.id,
      isMuted, screenSharing,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[voice/:id PATCH]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
