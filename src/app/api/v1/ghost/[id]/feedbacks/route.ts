import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { createHash } from "crypto";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

// Simple spam detection
function isSpam(content: string): boolean {
  const lower = content.toLowerCase();
  const spamKeywords = ["http://", "https://", "t.me/", "telegram", "discord.gg", "bit.ly", "viagra", "casino", "click here", "buy now"];
  const spamCount = spamKeywords.filter(k => lower.includes(k)).length;
  if (spamCount >= 2) return true;
  if (content.length < 3) return true;
  // Too many repeated chars (aaaaaa...)
  if (/(.)\1{9,}/.test(content)) return true;
  return false;
}

// GET /api/v1/ghost/[id]/feedbacks — owner reads feedbacks
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;
    const pool = await getPool();

    const owner = await pool.query("SELECT 1 FROM ghost_boxes WHERE id=$1 AND user_id=$2", [id, user.id]);
    if (!owner.rows[0]) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const showSpam = searchParams.get("spam") === "1";

    const r = await pool.query(
      `SELECT * FROM ghost_feedbacks WHERE box_id=$1 ${showSpam ? "" : "AND NOT is_spam"}
       ORDER BY is_pinned DESC, created_at DESC LIMIT 200`,
      [id]
    );

    // Mark all as read
    pool.query("UPDATE ghost_feedbacks SET is_read=true WHERE box_id=$1 AND NOT is_read", [id]).catch(() => {});

    return NextResponse.json({ feedbacks: r.rows.map(row => ({
      id: Number(row.id),
      content: row.content,
      isSpam: row.is_spam,
      isRead: row.is_read,
      isPinned: row.is_pinned,
      createdAt: Number(row.created_at),
    })) });
  } catch (err) {
    console.error("[ghost feedbacks GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// POST /api/v1/ghost/[id]/feedbacks — anonymous submit feedback
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pool = await getPool();

    const box = await pool.query("SELECT * FROM ghost_boxes WHERE id=$1 AND is_active=true", [id]);
    if (!box.rows[0]) return NextResponse.json({ error: "피드백 박스가 없거나 비활성화되었습니다" }, { status: 404 });

    const body = await request.json();
    const content = (body.content ?? "").trim();
    if (!content || content.length < 3) return NextResponse.json({ error: "내용이 너무 짧습니다 (3자 이상)" }, { status: 400 });
    if (content.length > 2000) return NextResponse.json({ error: "내용이 너무 깁니다 (최대 2000자)" }, { status: 400 });

    // Rate limit: check recent submissions from same IP (hashed)
    const ip = request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "unknown";
    const ipHash = createHash("sha256").update(ip + box.rows[0].id).digest("hex").slice(0, 16);

    const recentCount = await pool.query(
      "SELECT COUNT(*)::int AS c FROM ghost_feedbacks WHERE box_id=$1 AND ip_hash=$2 AND created_at > $3",
      [id, ipHash, Date.now() - 60_000 * 10] // 10 min window
    );
    if (recentCount.rows[0]?.c >= 5) {
      return NextResponse.json({ error: "잠시 후 다시 시도해주세요" }, { status: 429 });
    }

    const spam = isSpam(content);
    const now = Date.now();
    await pool.query(
      "INSERT INTO ghost_feedbacks (box_id, content, is_spam, created_at, ip_hash) VALUES ($1,$2,$3,$4,$5)",
      [id, content, spam, now, ipHash]
    );

    return NextResponse.json({ ok: true, message: spam ? "제출되었습니다" : "익명으로 전송되었습니다" }, { status: 201 });
  } catch (err) {
    console.error("[ghost feedbacks POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// PATCH /api/v1/ghost/[id]/feedbacks — mark pin/spam/read
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;
    const pool = await getPool();

    const owner = await pool.query("SELECT 1 FROM ghost_boxes WHERE id=$1 AND user_id=$2", [id, user.id]);
    if (!owner.rows[0]) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

    const body = await request.json();
    const { feedbackId, action } = body;
    if (!feedbackId || !action) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

    if (action === "pin") await pool.query("UPDATE ghost_feedbacks SET is_pinned=NOT is_pinned WHERE id=$1 AND box_id=$2", [feedbackId, id]);
    else if (action === "spam") await pool.query("UPDATE ghost_feedbacks SET is_spam=NOT is_spam WHERE id=$1 AND box_id=$2", [feedbackId, id]);
    else if (action === "delete") await pool.query("DELETE FROM ghost_feedbacks WHERE id=$1 AND box_id=$2", [feedbackId, id]);
    else return NextResponse.json({ error: "알 수 없는 액션" }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ghost feedbacks PATCH]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
