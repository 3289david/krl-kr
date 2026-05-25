import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth, verifyPassword, getSessionFromRequest } from "@/lib/auth";

interface Paste {
  id: string;
  user_id: string | null;
  slug: string;
  title: string | null;
  content: string;
  language: string;
  password_hash: string | null;
  expires_at: number | null;
  is_public: number;
  view_count: number;
  created_at: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDB(request);
  if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

  const paste = await db
    .prepare("SELECT * FROM pastes WHERE slug = ? LIMIT 1")
    .bind(slug)
    .first<Paste>();

  if (!paste) {
    return NextResponse.json({ error: "페이스트를 찾을 수 없습니다." }, { status: 404 });
  }

  // Check expiry
  if (paste.expires_at && Date.now() > paste.expires_at) {
    return NextResponse.json({ error: "만료된 페이스트입니다." }, { status: 410 });
  }

  // Password check
  if (paste.password_hash) {
    const { searchParams } = new URL(request.url);
    const password = searchParams.get("p");

    if (!password) {
      return NextResponse.json(
        { error: "비밀번호가 필요합니다.", requires_password: true },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, paste.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }
  }

  // Increment view count
  await db
    .prepare("UPDATE pastes SET view_count = view_count + 1 WHERE slug = ?")
    .bind(slug)
    .run();

  return NextResponse.json({
    id: paste.id,
    slug: paste.slug,
    title: paste.title,
    content: paste.content,
    language: paste.language,
    is_public: paste.is_public,
    expires_at: paste.expires_at ? new Date(paste.expires_at).toISOString() : null,
    view_count: paste.view_count + 1,
    created_at: new Date(paste.created_at).toISOString(),
    has_password: !!paste.password_hash,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDB(request);
  if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const result = await db
    .prepare("DELETE FROM pastes WHERE slug = ? AND user_id = ?")
    .bind(slug, user.id)
    .run();

  const changes = (result.meta as { changes?: number })?.changes ?? 0;
  if (changes === 0) {
    return NextResponse.json({ error: "페이스트를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
