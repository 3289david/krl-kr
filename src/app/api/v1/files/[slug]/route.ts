import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth, verifyPassword } from "@/lib/auth";

interface FileRecord {
  id: string;
  user_id: string | null;
  slug: string;
  original_name: string;
  r2_key: string;
  size: number;
  mime_type: string | null;
  password_hash: string | null;
  expires_at: number | null;
  max_downloads: number | null;
  download_count: number;
  created_at: number;
}

interface CloudflareRequest {
  cloudflare?: {
    env?: {
      STORAGE?: {
        get: (key: string) => Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
        delete: (key: string) => Promise<void>;
      };
    };
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDB(request);
  if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

  const file = await db
    .prepare("SELECT * FROM files WHERE slug = ? LIMIT 1")
    .bind(slug)
    .first<FileRecord>();

  if (!file) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  // Check expiry
  if (file.expires_at && Date.now() > file.expires_at) {
    return NextResponse.json({ error: "만료된 파일입니다." }, { status: 410 });
  }

  // Check max downloads
  if (file.max_downloads !== null && file.download_count >= file.max_downloads) {
    return NextResponse.json({ error: "최대 다운로드 횟수를 초과했습니다." }, { status: 410 });
  }

  // Password check
  if (file.password_hash) {
    const { searchParams } = new URL(request.url);
    const password = searchParams.get("p");

    if (!password) {
      return NextResponse.json(
        { error: "비밀번호가 필요합니다.", requires_password: true },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, file.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }
  }

  // Increment download count
  await db
    .prepare("UPDATE files SET download_count = download_count + 1 WHERE slug = ?")
    .bind(slug)
    .run();

  // Stream from R2
  const cfReq = request as unknown as CloudflareRequest;
  const storage = cfReq.cloudflare?.env?.STORAGE;
  if (storage) {
    const object = await storage.get(file.r2_key);
    if (object) {
      return new NextResponse(object.body, {
        headers: {
          "Content-Type": file.mime_type ?? "application/octet-stream",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(file.original_name)}"`,
          "Content-Length": file.size.toString(),
        },
      });
    }
  }

  // R2 not available - return file info
  return NextResponse.json({
    id: file.id,
    slug: file.slug,
    original_name: file.original_name,
    size: file.size,
    mime_type: file.mime_type,
    download_count: file.download_count + 1,
    expires_at: file.expires_at ? new Date(file.expires_at).toISOString() : null,
    created_at: new Date(file.created_at).toISOString(),
    message: "파일 스토리지가 설정되지 않았습니다.",
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDB(request);
  if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const file = await db
    .prepare("SELECT id, r2_key FROM files WHERE slug = ? AND user_id = ? LIMIT 1")
    .bind(slug, user.id)
    .first<{ id: string; r2_key: string }>();

  if (!file) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  // Delete from R2
  const cfReq = request as unknown as CloudflareRequest;
  const storage = cfReq.cloudflare?.env?.STORAGE;
  if (storage) {
    await storage.delete(file.r2_key);
  }

  await db
    .prepare("DELETE FROM files WHERE id = ?")
    .bind(file.id)
    .run();

  return NextResponse.json({ success: true });
}
