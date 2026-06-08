import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

// GET /api/v1/room/[code]/note
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const pool = await getPool();
    const r = await pool.query("SELECT * FROM krl_room_notes WHERE room_code=$1", [code]);
    return NextResponse.json({ content: r.rows[0]?.content ?? "", updatedAt: r.rows[0]?.updated_at ? Number(r.rows[0].updated_at) : null });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// PUT /api/v1/room/[code]/note
export async function PUT(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const pool = await getPool();
    const room = await pool.query("SELECT 1 FROM krl_rooms WHERE code=$1 AND archived_at IS NULL", [code]);
    if (!room.rows[0]) return NextResponse.json({ error: "방을 찾을 수 없습니다" }, { status: 404 });

    const { content } = await request.json();
    if (typeof content !== "string") return NextResponse.json({ error: "내용이 없습니다" }, { status: 400 });
    if (content.length > 50000) return NextResponse.json({ error: "메모가 너무 깁니다" }, { status: 400 });

    const now = Date.now();
    await pool.query(
      `INSERT INTO krl_room_notes (room_code, content, updated_at) VALUES ($1,$2,$3)
       ON CONFLICT (room_code) DO UPDATE SET content=$2, updated_at=$3`,
      [code, content, now]
    );
    await pool.query("UPDATE krl_rooms SET last_active_at=$1 WHERE code=$2", [now, code]);

    try {
      const redis = getRedis();
      redis.publish(`krl_room:${code}`, JSON.stringify({ type: "note", data: { content, updatedAt: now } }));
    } catch {}

    return NextResponse.json({ ok: true, updatedAt: now });
  } catch (err) {
    console.error("[room note PUT]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
