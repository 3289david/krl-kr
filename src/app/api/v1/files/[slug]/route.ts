import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth, verifyPassword } from "@/lib/auth";
import { deleteFile, getFilePath } from "@/lib/storage";
import { streamFile } from "@/lib/stream-file";
import { isVideo, queueHls } from "@/lib/hls";

export const runtime = "nodejs";

interface FileRecord {
  id: string;
  user_id: string | null;
  slug: string;
  original_name: string;
  storage_path: string;
  size: number;
  mime_type: string | null;
  password_hash: string | null;
  expires_at: number | null;
  max_downloads: number | null;
  download_count: number;
  created_at: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDB(request);

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

  const { searchParams: sp } = new URL(request.url);
  const isPreview = sp.get("preview") === "1";

  // Only increment download count for actual downloads (not preview/stream)
  if (!isPreview) {
    await db
      .prepare("UPDATE files SET download_count = download_count + 1 WHERE slug = ?")
      .bind(slug)
      .run();
  }

  const filePath = getFilePath(file.storage_path);
  const mimeType = file.mime_type ?? "application/octet-stream";

  // Queue HLS transcoding for video files (fire-and-forget)
  if (isVideo(mimeType)) {
    queueHls(filePath, `pub_${slug}`);
  }

  const disposition = isPreview
    ? `inline; filename="${encodeURIComponent(file.original_name)}"`
    : `attachment; filename="${encodeURIComponent(file.original_name)}"`;
  const res = streamFile(filePath, mimeType, request.headers.get("range"), disposition);
  if (res.status === 404) {
    return NextResponse.json(
      { error: "파일을 찾을 수 없습니다. 스토리지에서 삭제되었을 수 있습니다." },
      { status: 404 }
    );
  }
  return res;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDB(request);

  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const file = await db
    .prepare("SELECT id, storage_path FROM files WHERE slug = ? AND user_id = ? LIMIT 1")
    .bind(slug, user.id)
    .first<{ id: string; storage_path: string }>();

  if (!file) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  // Delete from local disk
  await deleteFile(file.storage_path);

  await db
    .prepare("DELETE FROM files WHERE id = ?")
    .bind(file.id)
    .run();

  return NextResponse.json({ success: true });
}
