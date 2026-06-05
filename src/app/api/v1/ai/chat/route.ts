import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_PROMPT = `당신은 krl.kr의 AI 어시스턴트입니다. 친절하고 유용하게 답변하세요.
- 한국어로 질문하면 한국어로, 영어로 질문하면 영어로 답변하세요.
- 간결하고 명확하게 답변하세요.
- 마크다운을 지원합니다.`;

// Plan → OpenAI model (GPT-5 tier)
const PLAN_OPENAI_MODEL: Record<string, string> = {
  free: "",                                           // no OpenAI — use Pollinations
  pro: process.env.OPENAI_PRO_MODEL ?? "gpt-5",
  vip: process.env.OPENAI_VIP_MODEL ?? "gpt-5-pro",
};

async function getUserPlan(request: NextRequest): Promise<string> {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return "free";
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const result = await pool.query("SELECT plan FROM user_plans WHERE user_id = $1", [session.userId]);
    return result.rows[0]?.plan ?? "free";
  } catch {
    return "free";
  }
}

async function openaiChat(messages: Message[], model: string, stream: boolean): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.slice(-20),
      ],
      stream,
      max_completion_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err.slice(0, 200)}`);
  }

  if (stream) {
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "X-AI-Model": model,
      },
    });
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  const text = data.choices?.[0]?.message?.content ?? "";
  return new Response(JSON.stringify({ content: text, model }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function pollinationsChat(messages: Message[], stream: boolean): Promise<Response> {
  const payload = {
    model: "openai",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.slice(-20),
    ],
    stream,
  };

  const upstream = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: stream ? "text/event-stream" : "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; KRL.KR/1.0)",
      Origin: "https://krl.kr",
      Referer: "https://krl.kr/",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });

  if (!upstream.ok) throw new Error(`Pollinations error: ${upstream.status}`);

  if (stream) {
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  const text = await upstream.text();
  return new Response(JSON.stringify({ content: text }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages: Message[] = body.messages ?? [];
    const stream: boolean = body.stream ?? false;

    if (!messages.length) {
      return new Response(JSON.stringify({ error: "메시지가 없습니다." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const plan = await getUserPlan(request);
    const openaiModel = PLAN_OPENAI_MODEL[plan] ?? "";
    const openaiKey = process.env.OPENAI_API_KEY;

    // Pro/VIP with OpenAI API key → use GPT-5
    if (plan !== "free" && openaiKey && openaiModel) {
      try {
        return await openaiChat(messages, openaiModel, stream);
      } catch (e) {
        console.error("[chat] OpenAI failed, falling back:", e);
        // Fall through to Pollinations
      }
    }

    // Free (or fallback): Pollinations
    return await pollinationsChat(messages, stream);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
