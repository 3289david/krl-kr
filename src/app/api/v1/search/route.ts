import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Primary: local SearXNG instance
// Backup: searxng.exe.xyz
const SEARXNG_LOCAL = "http://127.0.0.1:8888";
const SEARXNG_BACKUP = "https://searxng.exe.xyz";

async function fetchSearXNG(baseUrl: string, q: string, category: string, page: string) {
  const url = `${baseUrl}/search?q=${encodeURIComponent(q)}&format=json&categories=${encodeURIComponent(category)}&language=ko-KR&pageno=${page}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; KRL.KR/1.0)",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  // Consider it a failure if ALL engines are unresponsive and results are empty
  if (data.results?.length === 0 && data.unresponsive_engines?.length > 0) {
    const allFailed = data.unresponsive_engines.every(
      ([, reason]: [string, string]) =>
        reason.toLowerCase().includes("captcha") ||
        reason.toLowerCase().includes("access denied") ||
        reason.toLowerCase().includes("suspended") ||
        reason.toLowerCase().includes("too many requests")
    );
    if (allFailed) throw new Error("All search engines unavailable");
  }
  return data;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category") || "general";
  const page = searchParams.get("page") || "1";

  if (!q) {
    return NextResponse.json({ error: "검색어를 입력하세요." }, { status: 400 });
  }

  // Try local SearXNG first, fall back to searxng.exe.xyz
  const sources = [
    { url: SEARXNG_LOCAL, name: "local" },
    { url: SEARXNG_BACKUP, name: "backup" },
  ];

  let lastError = "";
  for (const source of sources) {
    try {
      const data = await fetchSearXNG(source.url, q, category, page);
      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "no-store",
          "X-Search-Source": source.name,
        },
      });
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[search] ${source.name} failed: ${lastError}`);
    }
  }

  return NextResponse.json(
    { error: `검색 서버에 연결할 수 없습니다. (${lastError})` },
    { status: 502 }
  );
}
