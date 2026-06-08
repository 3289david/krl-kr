import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

// GET — list my ghost boxes
export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;
    const pool = await getPool();
    const r = await pool.query(
      `SELECT g.*,
        (SELECT COUNT(*)::int FROM ghost_feedbacks f WHERE f.box_id=g.id AND NOT f.is_spam) AS total,
        (SELECT COUNT(*)::int FROM ghost_feedbacks f WHERE f.box_id=g.id AND NOT f.is_read AND NOT f.is_spam) AS unread
       FROM ghost_boxes g WHERE g.user_id=$1 ORDER BY g.created_at DESC`,
      [user.id]
    );
    return NextResponse.json({ boxes: r.rows.map(row => ({
      id: row.id, username: row.username, title: row.title,
      description: row.description, isActive: row.is_active,
      createdAt: Number(row.created_at), total: row.total, unread: row.unread,
    })) });
  } catch (err) {
    console.error("[ghost GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// POST — create ghost box
export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;
    const pool = await getPool();

    const body = await request.json();
    const username = (body.username ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const title = (body.title ?? "익명 피드백").trim().slice(0, 80);
    const description = (body.description ?? "").trim().slice(0, 300);

    if (!username || username.length < 2) return NextResponse.json({ error: "사용자명은 2자 이상이어야 합니다" }, { status: 400 });

    const exists = await pool.query("SELECT 1 FROM ghost_boxes WHERE username=$1", [username]);
    if (exists.rows[0]) return NextResponse.json({ error: "이미 사용 중인 이름입니다" }, { status: 409 });

    const id = nanoid(12);
    const now = Date.now();
    await pool.query(
      "INSERT INTO ghost_boxes (id, user_id, username, title, description, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
      [id, user.id, username, title, description, now]
    );
    return NextResponse.json({ id, username, title, description, createdAt: now, url: `/ghost/${username}` }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "23505") return NextResponse.json({ error: "이미 사용 중인 이름입니다" }, { status: 409 });
    console.error("[ghost POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
