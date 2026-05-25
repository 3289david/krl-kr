import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const db = getDB(request);
  if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

  const page = await db
    .prepare("SELECT * FROM bio_pages WHERE username = ? AND is_active = 1 LIMIT 1")
    .bind(username)
    .first<Record<string, unknown>>();

  if (!page) {
    return NextResponse.json({ error: "페이지를 찾을 수 없습니다." }, { status: 404 });
  }

  // Increment view count
  await db
    .prepare("UPDATE bio_pages SET view_count = view_count + 1 WHERE username = ?")
    .bind(username)
    .run();

  return NextResponse.json({
    page: {
      username: page.username,
      display_name: page.display_name,
      bio: page.bio,
      avatar_url: page.avatar_url,
      theme: page.theme,
      links: (() => { try { return JSON.parse(page.links as string); } catch { return []; } })(),
      social: (() => { try { return JSON.parse(page.social as string); } catch { return {}; } })(),
      view_count: (page.view_count as number) + 1,
    },
  });
}
