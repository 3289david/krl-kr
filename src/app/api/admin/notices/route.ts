/**
 * GET    /api/admin/notices          → 공지 목록
 * POST   /api/admin/notices          → 공지 작성
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const { searchParams } = new URL(request.url);
  const publicOnly = searchParams.get("public") === "1";

  // Public endpoint: active popup notices for all visitors
  if (publicOnly) {
    const now = Date.now();
    const popups = await db
      .prepare(
        `SELECT id, title, content, notice_type, pinned, popup, popup_expires_at, created_at
         FROM notices
         WHERE visible = 1 AND (
           (popup = 1 AND (popup_expires_at IS NULL OR popup_expires_at > ?))
           OR pinned = 1
         )
         ORDER BY pinned DESC, created_at DESC LIMIT 10`
      )
      .bind(now)
      .all<{
        id: number; title: string; content: string; notice_type: string;
        pinned: number; popup: number; popup_expires_at: number | null; created_at: number;
      }>();
    return NextResponse.json({ notices: popups.results });
  }

  // Admin endpoint
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const list = await db
    .prepare("SELECT * FROM notices ORDER BY created_at DESC LIMIT 100")
    .all<{
      id: number; title: string; content: string; author_email: string;
      notice_type: string; pinned: number; popup: number;
      popup_expires_at: number | null; visible: number;
      created_at: number; updated_at: number | null;
    }>();

  return NextResponse.json({ notices: list.results });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { title, content, notice_type = "notice", pinned = 0, popup = 0, popup_expires_at } =
    await request.json();

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "제목과 내용을 입력하세요." }, { status: 400 });
  }

  const result = await db
    .prepare(
      `INSERT INTO notices (title, content, author_email, notice_type, pinned, popup, popup_expires_at, visible, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?) RETURNING id`
    )
    .bind(
      title.trim(), content.trim(), check.email,
      notice_type, pinned ? 1 : 0, popup ? 1 : 0,
      popup_expires_at ?? null, Date.now()
    )
    .first<{ id: number }>();

  return NextResponse.json({ ok: true, id: result?.id });
}
