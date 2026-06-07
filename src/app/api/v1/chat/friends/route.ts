import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

// GET: list friends + pending requests
export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();

    // Friends (accepted both ways)
    const friends = await pool.query(
      `SELECT
        f.id, f.status, f.created_at,
        CASE WHEN f.requester_id=$1 THEN f.addressee_id ELSE f.requester_id END AS friend_id,
        u.name, u.username, u.avatar_url,
        CASE WHEN f.requester_id=$1 THEN 'sent' ELSE 'received' END AS direction
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.requester_id=$1 THEN f.addressee_id ELSE f.requester_id END
       WHERE (f.requester_id=$1 OR f.addressee_id=$1) AND f.status!='blocked'
       ORDER BY u.name ASC`,
      [user.id]
    );

    // Check online status from Redis
    const redis = getRedis();
    const result = await Promise.all(
      friends.rows.map(async f => {
        const online = await redis.exists(`online:${f.friend_id}`).catch(() => 0);
        return {
          id: Number(f.id),
          friendId: f.friend_id,
          name: f.name,
          username: f.username,
          avatar: f.avatar_url,
          status: f.status,
          direction: f.direction,
          online: Boolean(online),
          createdAt: Number(f.created_at),
        };
      })
    );

    return NextResponse.json({ friends: result });
  } catch (err) {
    console.error("[friends GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// POST: send friend request (by username or userId)
export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { username, userId } = await request.json();
    if (!username && !userId) return NextResponse.json({ error: "사용자명 또는 ID 필요" }, { status: 400 });

    const pool = await getPool();
    let target;
    if (username) {
      const r = await pool.query("SELECT id, name, username FROM users WHERE username=$1", [username.toLowerCase().trim()]);
      target = r.rows[0];
    } else {
      const r = await pool.query("SELECT id, name, username FROM users WHERE id=$1", [userId]);
      target = r.rows[0];
    }

    if (!target) return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
    if (target.id === user.id) return NextResponse.json({ error: "자기 자신에게는 신청할 수 없습니다" }, { status: 400 });

    // Check existing
    const existing = await pool.query(
      `SELECT * FROM friendships
       WHERE (requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)`,
      [user.id, target.id]
    );
    if (existing.rows[0]) {
      const f = existing.rows[0];
      if (f.status === "accepted") return NextResponse.json({ error: "이미 친구입니다" }, { status: 409 });
      if (f.status === "pending") {
        // They sent us a request → accept it
        if (f.addressee_id === user.id) {
          await pool.query("UPDATE friendships SET status='accepted', updated_at=$1 WHERE id=$2", [Date.now(), f.id]);
          return NextResponse.json({ ok: true, message: "친구 요청을 수락했습니다" });
        }
        return NextResponse.json({ error: "이미 친구 요청을 보냈습니다" }, { status: 409 });
      }
    }

    const now = Date.now();
    await pool.query(
      "INSERT INTO friendships (requester_id, addressee_id, status, created_at, updated_at) VALUES ($1,$2,'pending',$3,$3)",
      [user.id, target.id, now]
    );

    // Notify the target via Redis
    const redis = getRedis();
    const myRow = await pool.query("SELECT name, username, avatar_url FROM users WHERE id=$1", [user.id]);
    redis.publish(`chat:${target.id}`, JSON.stringify({
      type: "friend_request",
      from: { id: user.id, name: myRow.rows[0]?.name, username: myRow.rows[0]?.username, avatar: myRow.rows[0]?.avatar_url },
    })).catch(() => {});

    return NextResponse.json({ ok: true, message: "친구 요청을 보냈습니다" }, { status: 201 });
  } catch (err) {
    console.error("[friends POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
