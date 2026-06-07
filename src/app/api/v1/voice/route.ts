import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { nanoid } from "nanoid";

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
    const rooms = await pool.query(
      `SELECT r.*,
        (SELECT COUNT(*) FROM voice_room_members m WHERE m.room_id=r.id)::int AS member_count,
        (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar_url, 'muted', m2.is_muted))
          FROM voice_room_members m2 JOIN users u ON u.id=m2.user_id
          WHERE m2.room_id=r.id LIMIT 8
        ) AS members,
        EXISTS(SELECT 1 FROM voice_room_members WHERE room_id=r.id AND user_id=$1) AS joined
       FROM voice_rooms r
       WHERE r.is_public=true AND (r.expires_at IS NULL OR r.expires_at > $2)
       ORDER BY member_count DESC, r.created_at DESC
       LIMIT 50`,
      [user.id, Date.now()]
    );

    return NextResponse.json({
      rooms: rooms.rows.map(r => ({
        id: Number(r.id),
        name: r.name,
        description: r.description,
        isPublic: r.is_public,
        isTemporary: r.is_temporary,
        stageMode: r.stage_mode,
        ownerId: r.owner_id,
        quickCode: r.quick_code,
        memberCount: r.member_count,
        members: r.members ?? [],
        joined: r.joined,
        expiresAt: r.expires_at ? Number(r.expires_at) : null,
        createdAt: Number(r.created_at),
      }))
    });
  } catch (err) {
    console.error("[voice GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { name, description, isPublic = true, isTemporary = false, stageMode = false, expiresIn } = body;

    if (!name?.trim()) return NextResponse.json({ error: "이름 필요" }, { status: 400 });

    const pool = await getPool();
    const now = Date.now();
    const quickCode = nanoid(8).toUpperCase();
    const expiresAt = isTemporary ? now + (expiresIn ?? 86400) * 1000 : null;

    const r = await pool.query(
      `INSERT INTO voice_rooms (name, description, is_public, is_temporary, stage_mode, owner_id, quick_code, expires_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,
      [name.trim(), description?.trim() ?? null, isPublic, isTemporary, stageMode, user.id, quickCode, expiresAt, now]
    );
    const room = r.rows[0];

    // Auto-join as host
    await pool.query(
      "INSERT INTO voice_room_members (room_id, user_id, role, joined_at) VALUES ($1,$2,'host',$3)",
      [room.id, user.id, now]
    );

    return NextResponse.json({
      room: {
        id: Number(room.id), name: room.name, description: room.description,
        isPublic: room.is_public, isTemporary: room.is_temporary, stageMode: room.stage_mode,
        ownerId: room.owner_id, quickCode: room.quick_code, memberCount: 1, members: [],
        joined: true, expiresAt: room.expires_at ? Number(room.expires_at) : null,
        createdAt: Number(room.created_at),
      }
    }, { status: 201 });
  } catch (err) {
    console.error("[voice POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
