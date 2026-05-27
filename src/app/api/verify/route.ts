import { NextRequest, NextResponse } from "next/server";
import { verifyAltcha } from "@/lib/altcha";

/**
 * POST /api/verify
 * altcha 위젯이 PoW를 풀고 나서 서버 검증을 위해 호출하는 엔드포인트.
 * 위젯의 verifyurl 속성에 설정됨.
 *
 * Request body: { payload: "<base64>" }
 * Response: { success: true } | { success: false }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { payload?: string };
    const payload = body?.payload;

    if (!payload) {
      return NextResponse.json({ success: false, error: "payload required" }, { status: 400 });
    }

    const valid = await verifyAltcha(payload);

    return NextResponse.json(
      { success: valid },
      {
        status: valid ? 200 : 400,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
        },
      }
    );
  } catch {
    return NextResponse.json({ success: false, error: "verification failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "POST /api/verify" });
}
