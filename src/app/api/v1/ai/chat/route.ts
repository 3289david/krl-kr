import { NextRequest } from "next/server";

export const runtime = "nodejs";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_PROMPT = `당신은 krl.kr의 AI 어시스턴트입니다. 친절하고 유용하게 답변하세요.
- 한국어로 질문하면 한국어로, 영어로 질문하면 영어로 답변하세요.
- 간결하고 명확하게 답변하세요.
- 마크다운을 지원합니다.`;

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

    const payload = {
      model: "openai",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.slice(-20), // keep last 20 turns
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

    if (!upstream.ok) {
      throw new Error(`AI service error: ${upstream.status}`);
    }

    if (stream) {
      // Pass through the SSE stream
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
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
