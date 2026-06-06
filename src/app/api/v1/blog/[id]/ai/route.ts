import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

async function askPollinations(prompt: string): Promise<string> {
  const res = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      "Origin": "https://krl.kr",
      "Referer": "https://krl.kr/",
    },
    body: JSON.stringify({ model: "openai", messages: [{ role: "user", content: prompt }], stream: false }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Pollinations ${res.status}`);
  const text = (await res.text()).trim();
  if (!text || text.length < 3) throw new Error("empty response");
  return text;
}

async function askOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("no openai key");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_completion_tokens: 500 }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function ask(prompt: string): Promise<string> {
  try { return await askPollinations(prompt); }
  catch { return await askOpenAI(prompt); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const blog = await pool.query("SELECT id FROM blogs WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!blog.rows[0]) return NextResponse.json({ error: "블로그를 찾을 수 없습니다." }, { status: 404 });

    const { action, content, title } = await request.json();

    let result = "";

    switch (action) {
      case "suggest_titles": {
        const text = content?.slice(0, 1000) ?? title ?? "";
        result = await ask(`다음 블로그 글 내용을 바탕으로 클릭하고 싶은 블로그 제목 5개를 제안해줘. 번호 목록으로만 답해줘. 한국어로.\n\n${text}`);
        break;
      }
      case "summarize": {
        result = await ask(`다음 블로그 글을 2~3문장으로 핵심만 요약해줘. 한국어로.\n\n${content?.slice(0, 3000) ?? ""}`);
        break;
      }
      case "generate_tags": {
        const text = `제목: ${title ?? ""}\n내용: ${content?.slice(0, 800) ?? ""}`;
        result = await ask(`다음 블로그 글에 적합한 태그 5~8개를 쉼표로 구분해서 제안해줘. 태그만 출력해줘. 한국어+영어 혼용 가능.\n\n${text}`);
        break;
      }
      case "generate_seo": {
        const text = `제목: ${title ?? ""}\n내용: ${content?.slice(0, 1000) ?? ""}`;
        result = await ask(`다음 블로그 글의 SEO 메타 설명(160자 이내)을 작성해줘. 설명만 출력해줘. 한국어로.\n\n${text}`);
        break;
      }
      case "fix_spelling": {
        result = await ask(`다음 글의 맞춤법과 문법을 교정해줘. 교정된 전체 글만 출력해줘.\n\n${content?.slice(0, 5000) ?? ""}`);
        break;
      }
      default:
        return NextResponse.json({ error: "알 수 없는 액션" }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (err) {
    console.error("[blog ai POST]", err);
    return NextResponse.json({ error: "AI 요청에 실패했습니다." }, { status: 500 });
  }
}
