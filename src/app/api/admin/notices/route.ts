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

  const { title, content, notice_type = "notice", pinned = false, popup = false, popup_expires_at } =
    await request.json();

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "제목과 내용을 입력하세요." }, { status: 400 });
  }

  // Use raw pool to avoid RETURNING + LIMIT 1 bug
  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO notices (title, content, author_email, notice_type, pinned, popup, popup_expires_at, visible, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8) RETURNING id`,
    [
      title.trim(), content.trim(), check.email,
      notice_type, pinned ? 1 : 0, popup ? 1 : 0,
      popup_expires_at ?? null, Date.now()
    ]
  );

  // Log
  await pool.query(
    `INSERT INTO admin_log (admin_email, action, target_type, target_id, details, created_at)
     VALUES ($1, 'create_notice', 'notice', $2, $3, $4)`,
    [check.email, String(result.rows[0]?.id), title.trim(), Date.now()]
  );

  return NextResponse.json({ ok: true, id: result.rows[0]?.id });
}
