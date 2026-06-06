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

// Plan → OpenAI fallback model
const PLAN_OPENAI_MODEL: Record<string, string> = {
  free: "gpt-4o-mini",
  pro: "gpt-4o",
  vip: "gpt-4o",
};

// Plan → Pollinations model
const PLAN_POLLINATIONS_MODEL: Record<string, string> = {
  free: "openai",
  pro: "openai-large",
  vip: "openai-large",
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

async function chatWithPollinations(messages: Message[], plan: string): Promise<string | null> {
  try {
    const model = PLAN_POLLINATIONS_MODEL[plan] ?? "openai";
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Origin": "https://krl.kr",
        "Referer": "https://krl.kr/",
        "Accept": "text/plain, application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages.slice(-20)],
        stream: false,
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      console.warn("[chat] Pollinations failed:", res.status);
      return null;
    }
    const text = (await res.text()).trim();
    if (!text || text.length < 2 || text.startsWith('{"error')) return null;
    return text;
  } catch (err) {
    console.warn("[chat] Pollinations error:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function chatWithOpenAI(messages: Message[], plan: string, stream: boolean): Promise<Response | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = PLAN_OPENAI_MODEL[plan] ?? PLAN_OPENAI_MODEL.free;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages.slice(-20)],
      stream,
      max_completion_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[chat] OpenAI error:", response.status, err.slice(0, 200));
    return null;
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

    // 1. Try Pollinations first (free, no API key needed)
    if (!stream) {
      const pollinationsReply = await chatWithPollinations(messages, plan);
      if (pollinationsReply) {
        return new Response(JSON.stringify({ content: pollinationsReply, model: "pollinations" }), {
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      }
      console.warn("[chat] Pollinations unavailable, falling back to OpenAI GPT-4o");
    }

    // 2. Fall back to OpenAI GPT-4o
    const openAIResponse = await chatWithOpenAI(messages, plan, stream);
    if (openAIResponse) return openAIResponse;

    return new Response(JSON.stringify({ error: "AI 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요." }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[chat] error:", err);
    return new Response(JSON.stringify({ error: "오류가 발생했습니다. 잠시 후 다시 시도해주세요." }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
