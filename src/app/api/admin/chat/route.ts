/**
 * GET  /api/admin/chat?room=userId  → 채팅 메시지 조회
 * POST /api/admin/chat              → 메시지 전송
 * GET  /api/admin/chat?rooms=1      → 모든 채팅방 목록 (관리자용)
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const isAdmin = await (async () => {
    const { isAdmin: check } = await import("@/lib/admin");
    return check(db, session.email);
  })();

  // 관리자: 모든 채팅방 목록
  if (isAdmin && searchParams.get("rooms") === "1") {
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const result = await pool.query(`
      SELECT
        sc.room_id,
        u.email as user_email,
        u.name as user_name,
        MAX(sc.created_at) as last_message_at,
        COUNT(*) as message_count,
        SUM(CASE WHEN sc.read_by_admin = 0 AND sc.sender_role = 'user' THEN 1 ELSE 0 END) as unread_count
      FROM support_chat sc
      LEFT JOIN users u ON u.id = sc.room_id
      GROUP BY sc.room_id, u.email, u.name
      ORDER BY last_message_at DESC
      LIMIT 50
    `);
    return NextResponse.json({ rooms: result.rows });
  }

  // 특정 채팅방 메시지
  const roomId = isAdmin
    ? (searchParams.get("room") ?? session.userId)
    : session.userId;

  const messages = await db
    .prepare(
      `SELECT id, sender_email, sender_role, message, created_at
       FROM support_chat WHERE room_id = ? ORDER BY created_at ASC LIMIT 200`
    )
    .bind(roomId)
    .all<{
      id: number; sender_email: string; sender_role: string; message: string; created_at: number;
    }>();

  // 읽음 처리
  if (isAdmin) {
    await db
      .prepare("UPDATE support_chat SET read_by_admin = 1 WHERE room_id = ? AND sender_role = 'user'")
      .bind(roomId)
      .run();
  } else {
    await db
      .prepare("UPDATE support_chat SET read_by_user = 1 WHERE room_id = ? AND sender_role = 'admin'")
      .bind(roomId)
      .run();
  }

  return NextResponse.json({ messages: messages.results, roomId });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const { message, room_id } = await request.json();
  if (!message?.trim()) return NextResponse.json({ error: "메시지를 입력하세요." }, { status: 400 });

  const { isAdmin } = await import("@/lib/admin");
  const adminCheck = await isAdmin(db, session.email);

  const roomId = adminCheck ? (room_id ?? session.userId) : session.userId;
  const role = adminCheck ? "admin" : "user";

  await db
    .prepare(
      `INSERT INTO support_chat (room_id, sender_id, sender_email, sender_role, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(roomId, session.userId, session.email, role, message.trim(), Date.now())
    .run();

  return NextResponse.json({ ok: true });
}
