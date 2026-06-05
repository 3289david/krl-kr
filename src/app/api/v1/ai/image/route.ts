import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";


export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const planRow = await pool.query("SELECT plan FROM user_plans WHERE user_id = $1", [user.id]);
    const plan = (planRow.rows[0]?.plan ?? "free") as string;

    if (plan === "free") {
      return NextResponse.json(
        { error: "이미지 생성은 Pro 이상 플랜에서 사용 가능합니다.", upgrade_required: true },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { prompt, style = "vivid", size = "1024x1024" } = body;

    if (!prompt) return NextResponse.json({ error: "프롬프트를 입력해주세요." }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;

    // Use Claude to generate an image prompt, then use OpenAI DALL-E if available
    // Fallback: use Anthropic to describe the image and return a structured response
    if (apiKey) {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt,
          n: 1,
          size,
          quality: plan === "vip" ? "hd" : "standard",
          style,
          response_format: "url",
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error("[AI image] OpenAI error:", err);
        return NextResponse.json({ error: "이미지 생성에 실패했습니다." }, { status: 500 });
      }

      const data = await response.json() as { data: Array<{ url: string; revised_prompt?: string }> };
      return NextResponse.json({
        url: data.data[0]?.url,
        revised_prompt: data.data[0]?.revised_prompt,
        model: "dall-e-3",
      });
    }

    // Fallback: Stable Diffusion via Hugging Face (free tier)
    const hfToken = process.env.HF_API_TOKEN;
    if (hfToken) {
      const response = await fetch(
        "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: prompt }),
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        const base64 = buffer.toString("base64");
        return NextResponse.json({ base64, model: "stable-diffusion-xl" });
      }
    }

    return NextResponse.json(
      { error: "이미지 생성 API가 설정되지 않았습니다. OPENAI_API_KEY 또는 HF_API_TOKEN을 설정해주세요." },
      { status: 503 }
    );
  } catch (err) {
    console.error("[AI image POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
