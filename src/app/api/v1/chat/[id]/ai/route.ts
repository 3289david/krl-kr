import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

const AI_LIMITS: Record<string, number> = { free: 5, pro: 500, vip: 9999, starter: 50 };

async function callAI(prompt: string): Promise<string> {
  const res = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai-large",
      messages: [
        { role: "system", content: "당신은 한국어 채팅 AI 어시스턴트입니다. 간결하고 유용하게 답변하세요." },
        { role: "user", content: prompt }
      ],
      stream: false,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error("AI 서비스 오류");
  const text = await res.text();
  if (!text || text.startsWith('{"error')) {
    // Fallback to OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("AI 서비스 사용 불가");
    const r2 = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "당신은 한국어 채팅 AI 어시스턴트입니다." },
          { role: "user", content: prompt }
        ],
        max_tokens: 500,
      }),
    });
    const d2 = await r2.json();
    return d2.choices?.[0]?.message?.content ?? "응답 없음";
  }
  return text.trim();
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const member = await pool.query(
      "SELECT 1 FROM chat_members WHERE room_id=$1 AND user_id=$2",
      [id, user.id]
    );
    if (!member.rows[0]) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

    // Rate limit check (user_plans is the authoritative source)
    const planRow = await pool.query(
      "SELECT plan FROM user_plans WHERE user_id=$1",
      [user.id]
    );
    const plan = planRow.rows[0]?.plan ?? "free";
    const limit = AI_LIMITS[plan] ?? AI_LIMITS.free;

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const usageRow = await pool.query(
      "SELECT count FROM ai_chat_usage WHERE user_id=$1 AND date=$2",
      [user.id, today]
    ).catch(() => ({ rows: [] }));
    const used = parseInt(usageRow.rows[0]?.count ?? "0");

    if (used >= limit) {
      return NextResponse.json({ error: `AI 사용 한도(${limit}회/일)에 도달했습니다`, limitReached: true }, { status: 429 });
    }

    const { action } = await request.json();

    // Fetch recent messages
    const msgs = await pool.query(
      `SELECT m.content, u.name, m.created_at
       FROM chat_messages m JOIN users u ON u.id=m.user_id
       WHERE m.room_id=$1 AND m.deleted_at IS NULL AND m.type='text'
       ORDER BY m.created_at DESC LIMIT 50`,
      [id]
    );
    const history = msgs.rows.reverse().map(m => `${m.name}: ${m.content}`).join("\n");

    let result = "";

    if (action === "summary") {
      result = await callAI(`다음 채팅 대화를 한국어로 간결하게 요약해주세요 (최대 200자):\n\n${history}`);
    } else if (action === "suggest") {
      const raw = await callAI(
        `다음 채팅 대화에서 마지막 메시지에 대한 짧은 답변 3개를 제안해주세요.\n각 답변은 새 줄에 "1.", "2.", "3."으로 시작하세요.\n\n${history}`
      );
      // Parse suggestions
      const suggestions = raw.split("\n")
        .filter(l => /^[1-3]\./.test(l.trim()))
        .map(l => l.replace(/^[1-3]\.\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 3);
      result = suggestions.join("\n---\n");
      return NextResponse.json({ suggestions, raw });
    } else if (action === "meeting_notes") {
      result = await callAI(
        `다음 채팅 대화를 회의록 형식으로 정리해주세요. 주요 논의 사항, 결정 사항, 액션 아이템을 포함하세요:\n\n${history}`
      );
    } else {
      return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 });
    }

    // Record usage (upsert daily counter)
    pool.query(
      "INSERT INTO ai_chat_usage (user_id, date, count) VALUES ($1, CURRENT_DATE, 1) ON CONFLICT (user_id, date) DO UPDATE SET count = ai_chat_usage.count + 1",
      [user.id]
    ).catch(() => {});

    return NextResponse.json({ result, used: used + 1, limit });
  } catch (err) {
    console.error("[chat AI]", err);
    return NextResponse.json({ error: "AI 처리 실패" }, { status: 500 });
  }
}
