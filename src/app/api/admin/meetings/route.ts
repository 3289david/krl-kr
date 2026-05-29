/**
 * GET  /api/admin/meetings  → 회의 목록
 * POST /api/admin/meetings  → 새 회의 생성
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const meetings = await db
    .prepare(
      `SELECT m.*,
        (SELECT COUNT(*) FROM admin_meeting_messages WHERE meeting_id = m.id) as message_count,
        (SELECT sender_email FROM admin_meeting_messages WHERE meeting_id = m.id ORDER BY created_at DESC LIMIT 1) as last_sender,
        (SELECT MAX(created_at) FROM admin_meeting_messages WHERE meeting_id = m.id) as last_message_at
       FROM admin_meetings m ORDER BY created_at DESC LIMIT 50`
    )
    .all<{
      id: number; title: string; created_by: string; status: string;
      created_at: number; message_count: number; last_sender: string | null; last_message_at: number | null;
    }>();

  return NextResponse.json({ meetings: meetings.results });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { title } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: "회의 제목을 입력하세요." }, { status: 400 });

  const result = await db
    .prepare(
      `INSERT INTO admin_meetings (title, created_by, status, created_at)
       VALUES (?, ?, 'open', ?) RETURNING id`
    )
    .bind(title.trim(), check.email, Date.now())
    .first<{ id: number }>();

  return NextResponse.json({ ok: true, id: result?.id });
}
