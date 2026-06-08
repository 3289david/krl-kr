import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

// GET /api/v1/public/ghost/[username] — get box info for submission form
export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await params;
    const pool = await getPool();
    const r = await pool.query(
      `SELECT g.id, g.username, g.title, g.description, g.is_active, u.name AS owner_name
       FROM ghost_boxes g JOIN users u ON u.id = g.user_id WHERE g.username=$1`,
      [username.toLowerCase()]
    );
    if (!r.rows[0]) return NextResponse.json({ error: "찾을 수 없습니다" }, { status: 404 });
    const box = r.rows[0];
    return NextResponse.json({
      id: box.id,
      username: box.username,
      title: box.title,
      description: box.description,
      isActive: box.is_active,
      ownerName: box.owner_name,
    });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
