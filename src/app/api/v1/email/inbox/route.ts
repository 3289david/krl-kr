/**
 * GET /api/v1/email/inbox — 내 받은 편지함
 * 로그인한 사용자의 모든 별칭으로 받은 이메일 목록
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const db = getDB();
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const alias = searchParams.get("alias"); // filter by specific alias
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
    const offset = (page - 1) * limit;
    const unreadOnly = searchParams.get("unread") === "1";

    let query = `
      SELECT m.id, m.alias, m.from_address, m.to_address, m.subject,
             m.body_text, m.is_read, m.received_at, m.size
      FROM email_messages m
      WHERE m.user_id = ?
    `;
    const params: unknown[] = [user.id];

    if (alias) {
      query += " AND m.alias = ?";
      params.push(alias.toLowerCase());
    }
    if (unreadOnly) {
      query += " AND m.is_read = 0";
    }
    query += " ORDER BY m.received_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const messages = await db
      .prepare(query)
      .bind(...params)
      .all<{
        id: string;
        alias: string;
        from_address: string;
        to_address: string;
        subject: string;
        body_text: string;
        is_read: number;
        received_at: number;
        size: number;
      }>();

    // Count unread
    const unreadResult = await db
      .prepare("SELECT COUNT(*) as count FROM email_messages WHERE user_id = ? AND is_read = 0")
      .bind(user.id)
      .first<{ count: number }>();

    return NextResponse.json({
      messages: messages.results.map((m) => ({
        id: m.id,
        alias: m.alias,
        email: `${m.alias}@mail.krl.kr`,
        from: m.from_address,
        to: m.to_address,
        subject: m.subject,
        preview: (m.body_text ?? "").substring(0, 200),
        is_read: m.is_read === 1,
        received_at: new Date(m.received_at).toISOString(),
        size: m.size,
      })),
      unread_count: unreadResult?.count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    console.error("[/api/v1/email/inbox GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
