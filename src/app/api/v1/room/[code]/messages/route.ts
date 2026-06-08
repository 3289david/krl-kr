import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

async function resolveAuthor(request: NextRequest, pool: any) {
  try {
    const { requireAuth } = await import("@/lib/auth");
    const { getDB } = await import("@/lib/env");
    const db = getDB(request);
    const { user } = await requireAuth(db, request);
    if (user) {
      const u = await pool.query("SELECT name FROM users WHERE id=$1", [user.id]);
      return { userId: user.id, guestId: null, name: u.rows[0]?.name ?? "User" };
    }
  } catch {}
  return null;
}

// GET /api/v1/room/[code]/messages
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before");
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

    const pool = await getPool();
    const room = await pool.query("SELECT 1 FROM krl_rooms WHERE code=$1 AND archived_at IS NULL", [code]);
    if (!room.rows[0]) return NextResponse.json({ error: "방을 찾을 수 없습니다" }, { status: 404 });

    const q = before
      ? await pool.query(
          "SELECT * FROM krl_room_messages WHERE room_code=$1 AND id<$2 ORDER BY created_at DESC LIMIT $3",
          [code, before, limit]
        )
      : await pool.query(
          "SELECT * FROM krl_room_messages WHERE room_code=$1 ORDER BY created_at DESC LIMIT $2",
          [code, limit]
        );

    const messages = q.rows.reverse().map((r: any) => ({
      id: Number(r.id),
      authorName: r.author_name,
      userId: r.user_id,
      guestId: r.guest_id,
      content: r.content,
      type: r.type,
      createdAt: Number(r.created_at),
    }));

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("[room messages GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// POST /api/v1/room/[code]/messages
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const pool = await getPool();
    const room = await pool.query("SELECT 1 FROM krl_rooms WHERE code=$1 AND archived_at IS NULL", [code]);
    if (!room.rows[0]) return NextResponse.json({ error: "방을 찾을 수 없습니다" }, { status: 404 });

    const body = await request.json();
    const content = (body.content ?? "").trim();
    if (!content) return NextResponse.json({ error: "내용이 없습니다" }, { status: 400 });
    if (content.length > 4000) return NextResponse.json({ error: "메시지가 너무 깁니다" }, { status: 400 });

    const guestId = body.guestId ?? null;
    const guestName = (body.guestName ?? "Guest").slice(0, 30);

    const author = await resolveAuthor(request, pool);
    const userId = author?.userId ?? null;
    const authorName = author?.name ?? guestName;
    const now = Date.now();

    const r = await pool.query(
      `INSERT INTO krl_room_messages (room_code, user_id, guest_id, author_name, content, type, created_at)
       VALUES ($1,$2,$3,$4,$5,'text',$6) RETURNING *`,
      [code, userId, guestId, authorName, content, now]
    );
    await pool.query("UPDATE krl_rooms SET last_active_at=$1 WHERE code=$2", [now, code]);

    const msg = {
      id: Number(r.rows[0].id),
      authorName,
      userId,
      guestId,
      content,
      type: "text",
      createdAt: now,
    };

    // Publish to SSE subscribers
    try {
      const redis = getRedis();
      redis.publish(`krl_room:${code}`, JSON.stringify({ type: "message", data: msg }));
    } catch {}

    return NextResponse.json({ message: msg }, { status: 201 });
  } catch (err) {
    console.error("[room messages POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
