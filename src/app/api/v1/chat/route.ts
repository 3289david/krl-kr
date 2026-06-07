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
    const { searchParams } = new URL(request.url);
    const isPublicFilter = searchParams.get("public") === "1";

    // Public rooms discovery (not necessarily joined)
    if (isPublicFilter) {
      const result = await pool.query(
        `SELECT r.id, r.type, r.name, r.description, r.avatar, r.invite_code,
          r.owner_id, r.created_at, r.updated_at,
          (SELECT COUNT(*) FROM chat_members WHERE room_id=r.id)::int AS member_count,
          EXISTS(SELECT 1 FROM chat_members WHERE room_id=r.id AND user_id=$1) AS joined,
          (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar_url))
            FROM chat_members m2 JOIN users u ON u.id=m2.user_id
            WHERE m2.room_id=r.id LIMIT 5) AS other_members
         FROM chat_rooms r
         WHERE r.is_public=true AND r.type != 'direct'
         ORDER BY member_count DESC, r.created_at DESC
         LIMIT 50`,
        [user.id]
      );
      return NextResponse.json({
        rooms: result.rows.map(r => ({
          id: Number(r.id), type: r.type, name: r.name, description: r.description,
          avatar: r.avatar, isPublic: true, ownerId: r.owner_id, inviteCode: r.invite_code,
          role: null, lastReadAt: 0, unread: 0, otherMembers: r.other_members ?? [],
          lastMessage: null, memberCount: r.member_count, joined: r.joined,
          createdAt: Number(r.created_at), updatedAt: Number(r.updated_at),
        }))
      });
    }

    const result = await pool.query(
      `SELECT
        r.id, r.type, r.name, r.description, r.avatar, r.is_public,
        r.owner_id, r.invite_code, r.created_at, r.updated_at,
        cm.role, cm.last_read_at,
        -- Last message
        lm.id AS last_msg_id,
        lm.content AS last_msg_content,
        lm.created_at AS last_msg_at,
        lm.user_id AS last_msg_user,
        lm_u.name AS last_msg_name,
        -- Unread count
        (SELECT COUNT(*) FROM chat_messages msg
          WHERE msg.room_id = r.id
            AND msg.created_at > cm.last_read_at
            AND msg.deleted_at IS NULL
            AND msg.user_id != $1
        )::int AS unread,
        -- Members (for DM display name)
        (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar_url))
          FROM chat_members m2
          JOIN users u ON u.id = m2.user_id
          WHERE m2.room_id = r.id AND m2.user_id != $1
          LIMIT 5
        ) AS other_members
      FROM chat_rooms r
      JOIN chat_members cm ON cm.room_id = r.id AND cm.user_id = $1
      LEFT JOIN LATERAL (
        SELECT id, content, created_at, user_id FROM chat_messages
        WHERE room_id = r.id AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 1
      ) lm ON true
      LEFT JOIN users lm_u ON lm_u.id = lm.user_id
      ORDER BY COALESCE(lm.created_at, r.created_at) DESC`,
      [user.id]
    );

    const rooms = result.rows.map(r => ({
      id: Number(r.id),
      type: r.type,
      name: r.name,
      description: r.description,
      avatar: r.avatar,
      isPublic: r.is_public,
      ownerId: r.owner_id,
      inviteCode: r.invite_code,
      role: r.role,
      lastReadAt: Number(r.last_read_at ?? 0),
      unread: r.unread ?? 0,
      otherMembers: r.other_members ?? [],
      lastMessage: r.last_msg_id
        ? { id: Number(r.last_msg_id), content: r.last_msg_content, userId: r.last_msg_user, name: r.last_msg_name, createdAt: Number(r.last_msg_at) }
        : null,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
    }));

    return NextResponse.json({ rooms });
  } catch (err) {
    console.error("[chat GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { type = "group", name, description, members = [], isPublic = false } = body;

    if (!["direct", "group", "channel"].includes(type)) {
      return NextResponse.json({ error: "잘못된 타입" }, { status: 400 });
    }
    if (type !== "direct" && !name?.trim()) {
      return NextResponse.json({ error: "이름이 필요합니다" }, { status: 400 });
    }

    const pool = await getPool();
    const now = Date.now();
    const inviteCode = type !== "direct" ? nanoid(10) : null;

    const r = await pool.query(
      `INSERT INTO chat_rooms (type, name, description, invite_code, is_public, owner_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
      [type, name?.trim() ?? null, description?.trim() ?? null, inviteCode, isPublic, user.id, now]
    );
    const room = r.rows[0];

    // Add creator as owner
    await pool.query(
      "INSERT INTO chat_members (room_id, user_id, role, joined_at) VALUES ($1,$2,'owner',$3)",
      [room.id, user.id, now]
    );

    // Add invited members
    const uniqueMembers = [...new Set(members)].filter((id: unknown) => id !== user.id);
    for (const memberId of uniqueMembers as string[]) {
      await pool.query(
        "INSERT INTO chat_members (room_id, user_id, role, joined_at) VALUES ($1,$2,'member',$3) ON CONFLICT DO NOTHING",
        [room.id, memberId, now]
      ).catch(() => {});
    }

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
        role: "owner",
        lastReadAt: 0,
        unread: 0,
        otherMembers: [],
        lastMessage: null,
        createdAt: Number(room.created_at),
        updatedAt: Number(room.updated_at),
      }
    }, { status: 201 });
  } catch (err) {
    console.error("[chat POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
