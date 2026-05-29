/** POST /api/reports — 신고 제출 (로그인 필요) */
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { target_type, target_id, target_value, reason } = await request.json();

  if (!target_type || !target_id || !reason?.trim()) {
    return NextResponse.json({ error: "신고 유형, 대상, 사유를 모두 입력하세요." }, { status: 400 });
  }
  if (reason.trim().length < 5) {
    return NextResponse.json({ error: "신고 사유를 5자 이상 입력하세요." }, { status: 400 });
  }

  const validTypes = ["link", "subdomain", "email", "post", "user", "content"];
  if (!validTypes.includes(target_type)) {
    return NextResponse.json({ error: "유효하지 않은 신고 유형입니다." }, { status: 400 });
  }

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  // 같은 대상에 이미 신고했는지 확인 (24시간 내)
  const existing = await pool.query(
    `SELECT id FROM user_reports WHERE reporter_id = $1 AND target_id = $2 AND created_at > $3`,
    [session.userId, target_id, Date.now() - 86400000]
  );
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "이미 신고한 대상입니다. 24시간 후 다시 신고할 수 있습니다." }, { status: 409 });
  }

  await pool.query(
    `INSERT INTO user_reports (reporter_id, reporter_email, target_type, target_id, target_value, reason, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
    [session.userId, session.email, target_type, target_id, target_value ?? null, reason.trim(), Date.now()]
  );

  return NextResponse.json({ ok: true });
}
