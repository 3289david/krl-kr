/**
 * GET  /api/admin/admins  → 관리자 목록
 * POST /api/admin/admins  → 관리자 추가 (마스터만)
 * DELETE /api/admin/admins?email=... → 관리자 해제 (마스터만)
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin, requireMaster, MASTER_ADMIN_EMAIL } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const list = await db
    .prepare("SELECT * FROM admins ORDER BY appointed_at DESC")
    .all<{
      id: number; user_id: string; email: string; role: string;
      appointed_by: string | null; appointed_at: number; notes: string | null;
    }>();

  const admins = [
    {
      email: MASTER_ADMIN_EMAIL,
      role: "master",
      appointed_by: "system",
      appointed_at: 0,
      notes: "마스터 관리자 (하드코딩)",
      removable: false,
    },
    ...list.results
      .filter((a) => a.email.toLowerCase() !== MASTER_ADMIN_EMAIL.toLowerCase())
      .map((a) => ({ ...a, removable: true })),
  ];

  return NextResponse.json({ admins });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireMaster(session);
  if (!check.ok) return check.response;

  const { email, notes } = await request.json();
  if (!email) return NextResponse.json({ error: "이메일을 입력하세요." }, { status: 400 });

  const normalizedEmail = email.toLowerCase().trim();
  if (normalizedEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "마스터 관리자는 이미 설정되어 있습니다." }, { status: 409 });
  }

  const user = await db
    .prepare("SELECT id, email FROM users WHERE email = ? LIMIT 1")
    .bind(normalizedEmail)
    .first<{ id: string; email: string }>();

  if (!user) return NextResponse.json({ error: "해당 이메일의 사용자가 없습니다." }, { status: 404 });

  await db
    .prepare(
      `INSERT INTO admins (user_id, email, role, appointed_by, notes, appointed_at)
       VALUES (?, ?, 'admin', ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET role = 'admin', notes = ?, appointed_by = ?`
    )
    .bind(user.id, user.email, check.email, notes ?? null, Date.now(), notes ?? null, check.email)
    .run();

  return NextResponse.json({ ok: true, email: user.email });
}

export async function DELETE(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireMaster(session);
  if (!check.ok) return check.response;

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  if (!email) return NextResponse.json({ error: "이메일을 입력하세요." }, { status: 400 });

  if (email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "마스터 관리자는 해제할 수 없습니다." }, { status: 403 });
  }

  await db.prepare("DELETE FROM admins WHERE email = ?").bind(email.toLowerCase()).run();
  return NextResponse.json({ ok: true });
}
