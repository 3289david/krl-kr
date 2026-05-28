import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category") || "general";
  const page = searchParams.get("page") || "1";

  if (!q) {
    return NextResponse.json({ error: "검색어를 입력하세요." }, { status: 400 });
  }

  try {
    const upstream = `https://searxng.exe.xyz/search?q=${encodeURIComponent(q)}&format=json&categories=${encodeURIComponent(category)}&language=ko-KR&pageno=${page}`;

    const res = await fetch(upstream, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; KRL.KR/1.0)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "검색 서버 오류" }, { status: 502 });
    }

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: `검색 실패: ${msg}` }, { status: 502 });
  }
}
