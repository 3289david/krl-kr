/**
 * GET /api/v1/email/inbox/[id]  — 이메일 전체 내용 조회 (읽음 처리)
 * DELETE /api/v1/email/inbox/[id] — 이메일 삭제
 * PATCH /api/v1/email/inbox/[id] — 읽음/안읽음 상태 변경
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDB();
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { id } = await params;

    const message = await db
      .prepare(
        `SELECT * FROM email_messages WHERE id = ?
         AND (user_id = ? OR alias IN (SELECT alias FROM email_aliases WHERE user_id = ?))`
      )
      .bind(id, user.id, user.id)
      .first<{
        id: string;
        alias: string;
        from_address: string;
        to_address: string;
        subject: string;
        body_text: string;
        body_html: string;
        headers: string;
        size: number;
        is_read: number;
        received_at: number;
        created_at: number;
      }>();

    if (!message) {
      return NextResponse.json({ error: "이메일을 찾을 수 없습니다." }, { status: 404 });
    }

    // Mark as read
    if (message.is_read === 0) {
      await db
        .prepare("UPDATE email_messages SET is_read = 1 WHERE id = ?")
        .bind(id)
        .run();
    }

    return NextResponse.json({
      id: message.id,
      alias: message.alias,
      email: `${message.alias}@krl.kr`,
      from: message.from_address,
      to: message.to_address,
      subject: message.subject,
      body_text: message.body_text,
      body_html: message.body_html,
      headers: (() => { try { return JSON.parse(message.headers ?? "{}"); } catch { return {}; } })(),
      size: message.size,
      is_read: true,
      received_at: new Date(Number(message.received_at)).toISOString(),
    });
  } catch (err) {
    console.error("[/api/v1/email/inbox/[id] GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDB();
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { id } = await params;

    const result = await db
      .prepare(`DELETE FROM email_messages WHERE id = ?
        AND (user_id = ? OR alias IN (SELECT alias FROM email_aliases WHERE user_id = ?))`)
      .bind(id, user.id, user.id)
      .run();

    if ((result.meta.changes ?? 0) === 0) {
      return NextResponse.json({ error: "이메일을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/v1/email/inbox/[id] DELETE]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Mark as read/unread
  try {
    const db = getDB();
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { id } = await params;
    const body = await request.json() as { is_read?: boolean };
    const isRead = body.is_read === true ? 1 : 0;

    await db
      .prepare(`UPDATE email_messages SET is_read = ? WHERE id = ?
        AND (user_id = ? OR alias IN (SELECT alias FROM email_aliases WHERE user_id = ?))`)
      .bind(isRead, id, user.id, user.id)
      .run();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/v1/email/inbox/[id] PATCH]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
