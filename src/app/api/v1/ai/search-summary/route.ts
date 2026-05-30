import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { query, snippets } = await request.json();

    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: "쿼리가 없습니다." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build compact context from top search results (keep it short)
    const context = (snippets as { title: string; content: string }[] | undefined)
      ?.slice(0, 4)
      .filter((s) => s.content?.trim())
      .map((s, i) => `[${i + 1}] ${s.title}: ${s.content.slice(0, 200)}`)
      .join("\n") ?? "";

    const userMessage = context
      ? `"${query}" 검색 결과:\n${context}\n\n위 내용을 바탕으로 2~3문장으로 요약해줘. 핵심만 간결하게.`
      : `"${query}"에 대해 2~3문장으로 간결하게 설명해줘.`;

    const payload = {
      model: "openai",
      messages: [
        {
          role: "system",
          content: "검색 결과를 2~3문장으로 요약하는 AI입니다. 출처 번호·링크 없이 핵심 정보만 답변하세요.",
        },
        { role: "user", content: userMessage },
      ],
      stream: false,
    };

    const upstream = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/plain, application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Origin: "https://krl.kr",
        Referer: "https://krl.kr/",
      },
      body: JSON.stringify(payload),
      // 20s timeout — Pollinations can be slow
      signal: AbortSignal.timeout(20000),
    });

    if (!upstream.ok) {
      throw new Error(`upstream ${upstream.status}`);
    }

    const text = (await upstream.text()).trim();

    // Reject obviously bad responses
    if (!text || text.length < 10 || text.startsWith("{")) {
      throw new Error("empty or invalid response");
    }

    return new Response(JSON.stringify({ summary: text }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "오류";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
