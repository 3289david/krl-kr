import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { publishToRoom } from "@/lib/chat";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const userRow = await pool.query("SELECT name FROM users WHERE id=$1", [user.id]);

    await publishToRoom(pool, Number(id), {
      type: "typing",
      roomId: Number(id),
      userId: user.id,
      name: userRow.rows[0]?.name ?? "Unknown",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
