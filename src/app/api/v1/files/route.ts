import { handleAPIError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth, hashPassword, getSessionFromRequest } from "@/lib/auth";
import { generateId, generateSlug } from "@/lib/utils";
import { saveFile, getFilePath } from "@/lib/storage";
import { isVideo, queueHls } from "@/lib/hls";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);

    // Try to get user (optional)
    const session = await getSessionFromRequest(request);
    let userId: string | null = null;
    let isAuthenticated = false;

    if (session) {
      userId = session.userId;
      isAuthenticated = true;
    }

    const maxSizeMB = isAuthenticated
      ? parseInt(process.env.MAX_FILE_SIZE_MB_AUTH ?? "500")
      : parseInt(process.env.MAX_FILE_SIZE_MB ?? "100");
    const maxSize = maxSizeMB * 1024 * 1024;

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "multipart/form-data 요청만 허용됩니다." }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "파일을 선택해주세요." }, { status: 400 });
    }

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `파일 크기는 최대 ${maxSizeMB}MB입니다.` },
        { status: 413 }
      );
    }

    const expiresAtStr = formData.get("expires_at")?.toString();
    const maxDownloadsStr = formData.get("max_downloads")?.toString();
    const password = formData.get("password")?.toString();

    let expiresAt: number | null = null;
    if (expiresAtStr) {
      expiresAt = new Date(expiresAtStr).getTime();
      if (isNaN(expiresAt)) expiresAt = null;
    }

    const maxDownloads = maxDownloadsStr ? parseInt(maxDownloadsStr, 10) : null;
    let passwordHash: string | null = null;
    if (password) {
      passwordHash = await hashPassword(password);
    }

    // Generate unique slug
    let slug = generateSlug(8);
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.prepare("SELECT id FROM files WHERE slug = ? LIMIT 1").bind(slug).first();
      if (!existing) break;
      slug = generateSlug(8 + Math.floor(attempts / 3));
      attempts++;
    }

    const fileId = generateId("fil");
    const now = Date.now();

    // Save to local disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { key: storagePath } = await saveFile(buffer, file.name, file.type);

    // Queue HLS for video files immediately after upload
    if (isVideo(file.type)) {
      queueHls(getFilePath(storagePath), `pub_${slug}`);
    }

    await db
      .prepare(
        `INSERT INTO files (id, user_id, slug, original_name, storage_path, size, mime_type, password_hash, expires_at, max_downloads, download_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
      )
      .bind(
        fileId,
        userId,
        slug,
        file.name,
        storagePath,
        file.size,
        file.type || "application/octet-stream",
        passwordHash,
        expiresAt,
        maxDownloads,
        now
      )
      .run();

    const appUrl = process.env.APP_URL ?? "https://krl.kr";
    return NextResponse.json(
      {
        id: fileId,
        slug,
        url: `${appUrl}/f/${slug}`,
        original_name: file.name,
        size: file.size,
        mime_type: file.type,
        has_password: !!passwordHash,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        max_downloads: maxDownloads,
        created_at: new Date(now).toISOString(),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[/api/v1/files POST] Error:", err);
    return NextResponse.json({ error: "파일 업로드에 실패했습니다." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);

    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));
    const offset = (page - 1) * limit;

    const result = await db
      .prepare(
        `SELECT id, slug, original_name, size, mime_type, expires_at, max_downloads, download_count, created_at
         FROM files WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(user.id, limit, offset)
      .all<Record<string, unknown>>();

    const countResult = await db
      .prepare("SELECT COUNT(*) as count FROM files WHERE user_id = ?")
      .bind(user.id)
      .first<{ count: number }>();

    const total = countResult?.count ?? 0;

    return NextResponse.json({
      files: result.results.map((f) => ({
        ...f,
        created_at: Number(f.created_at),
        expires_at: f.expires_at != null ? Number(f.expires_at) : null,
        size: Number(f.size),
        max_downloads: f.max_downloads != null ? Number(f.max_downloads) : null,
        download_count: Number(f.download_count),
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[/api/v1/files GET] Error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
