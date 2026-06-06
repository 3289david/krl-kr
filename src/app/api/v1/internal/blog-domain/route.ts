import { NextRequest, NextResponse } from "next/server";
import { serveBlog } from "../sub/route";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const cleanHost = host.split(":")[0].toLowerCase().trim();

  if (!cleanHost || cleanHost.includes("krl.kr")) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const result = await pool.query(
      "SELECT * FROM blogs WHERE custom_domain = $1 AND is_public = TRUE LIMIT 1",
      [cleanHost]
    );

    if (!result.rows[0]) {
      return new NextResponse(
        `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>블로그를 찾을 수 없습니다</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc"><div style="text-align:center"><h1 style="font-size:1.5rem;font-weight:700;margin-bottom:12px">블로그를 찾을 수 없습니다</h1><p style="color:#64748b">이 도메인에 연결된 블로그가 없습니다.</p><p style="margin-top:16px"><a href="https://krl.kr" style="color:#2563eb">KRL.KR 바로가기 →</a></p></div></body></html>`,
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    return await serveBlog(pool, result.rows[0], request, `https://${cleanHost}`);
  } catch (err) {
    console.error("[blog-domain GET]", err);
    return new NextResponse("Server Error", { status: 500 });
  }
}
