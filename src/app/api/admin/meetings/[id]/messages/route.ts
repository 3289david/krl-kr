/**
 * GET  /api/admin/meetings/[id]/messages  → 회의 메시지 조회
 * POST /api/admin/meetings/[id]/messages  → 메시지 전송
 * PATCH /api/admin/meetings/[id]/messages → 회의 상태 변경 (open/closed)
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id } = await params;

  const [meeting, messages] = await Promise.all([
    db
      .prepare("SELECT * FROM admin_meetings WHERE id = ? LIMIT 1")
      .bind(Number(id))
      .first<{ id: number; title: string; created_by: string; status: string; created_at: number }>(),
    db
      .prepare(
        "SELECT * FROM admin_meeting_messages WHERE meeting_id = ? ORDER BY created_at ASC LIMIT 500"
      )
      .bind(Number(id))
      .all<{ id: number; meeting_id: number; sender_email: string; message: string; created_at: number }>(),
  ]);

  if (!meeting) return NextResponse.json({ error: "회의를 찾을 수 없습니다." }, { status: 404 });

  return NextResponse.json({ meeting, messages: messages.results });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id } = await params;
  const { message } = await request.json();
  if (!message?.trim()) return NextResponse.json({ error: "메시지를 입력하세요." }, { status: 400 });

  const meeting = await db
    .prepare("SELECT id, status FROM admin_meetings WHERE id = ? LIMIT 1")
    .bind(Number(id))
    .first<{ id: number; status: string }>();

  if (!meeting) return NextResponse.json({ error: "회의를 찾을 수 없습니다." }, { status: 404 });
  if (meeting.status === "closed") return NextResponse.json({ error: "종료된 회의입니다." }, { status: 403 });

  await db
    .prepare(
      "INSERT INTO admin_meeting_messages (meeting_id, sender_email, message, created_at) VALUES (?, ?, ?, ?)"
    )
    .bind(Number(id), check.email, message.trim(), Date.now())
    .run();

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id } = await params;
  const { status } = await request.json();
  if (!["open", "closed"].includes(status)) return NextResponse.json({ error: "잘못된 상태입니다." }, { status: 400 });

  await db
    .prepare("UPDATE admin_meetings SET status = ? WHERE id = ?")
    .bind(status, Number(id))
    .run();

  return NextResponse.json({ ok: true });
}
