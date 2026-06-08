import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

// POST /api/v1/room — create a room (auth optional)
export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { requireAuth } = await import("@/lib/auth");
    const authResult = await requireAuth(db, request).catch(() => ({ user: null, error: null }));
    const user = (authResult as any).user ?? null;

    const body = await request.json().catch(() => ({}));
    const guestId = body.guestId ?? null;
    const name = (body.name ?? "").trim().slice(0, 80);

    const pool = await getPool();
    // Generate unique 6-char code
    let code = "";
    for (let i = 0; i < 10; i++) {
      const candidate = nanoid(6).toLowerCase().replace(/[^a-z0-9]/g, "x").slice(0, 6);
      const exists = await pool.query("SELECT 1 FROM krl_rooms WHERE code=$1", [candidate]);
      if (!exists.rows[0]) { code = candidate; break; }
    }
    if (!code) code = nanoid(10).toLowerCase().slice(0, 10);

    const now = Date.now();
    await pool.query(
      `INSERT INTO krl_rooms (code, owner_id, owner_guest_id, name, created_at, last_active_at)
       VALUES ($1,$2,$3,$4,$5,$5)`,
      [code, user?.id ?? null, guestId, name, now]
    );

    // Create blank note
    await pool.query(
      `INSERT INTO krl_room_notes (room_code, content, updated_at) VALUES ($1,'',$2) ON CONFLICT DO NOTHING`,
      [code, now]
    );

    return NextResponse.json({ code, name, createdAt: now }, { status: 201 });
  } catch (err) {
    console.error("[room POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
