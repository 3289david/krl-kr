import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth, hashPassword, getSessionFromRequest } from "@/lib/auth";
import { generateId, generateSlug } from "@/lib/utils";

interface CloudflareRequest {
  cloudflare?: {
    env?: {
      STORAGE?: {
        put: (key: string, body: ReadableStream | ArrayBuffer, options?: Record<string, unknown>) => Promise<unknown>;
        get: (key: string) => Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
        delete: (key: string) => Promise<void>;
      };
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

    // Try to get user (optional)
    const session = await getSessionFromRequest(request);
    let userId: string | null = null;
    let isAuthenticated = false;

    if (session) {
      userId = session.userId;
      isAuthenticated = true;
    }

    const maxSize = isAuthenticated ? 1024 * 1024 * 1024 : 100 * 1024 * 1024; // 1GB auth, 100MB anon

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
      const maxMB = maxSize / 1024 / 1024;
      return NextResponse.json(
        { error: `파일 크기는 최대 ${maxMB >= 1024 ? `${maxMB / 1024}GB` : `${maxMB}MB`}입니다.` },
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
    const r2Key = `files/${fileId}/${file.name}`;
    const now = Date.now();

    // Store in R2 if available
    const cfReq = request as unknown as CloudflareRequest;
    const storage = cfReq.cloudflare?.env?.STORAGE;
    if (storage) {
      const arrayBuffer = await file.arrayBuffer();
      await storage.put(r2Key, arrayBuffer, {
        httpMetadata: { contentType: file.type || "application/octet-stream" },
      });
    }

    await db
      .prepare(
        `INSERT INTO files (id, user_id, slug, original_name, r2_key, size, mime_type, password_hash, expires_at, max_downloads, download_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
      )
      .bind(
        fileId,
        userId,
        slug,
        file.name,
        r2Key,
        file.size,
        file.type || "application/octet-stream",
        passwordHash,
        expiresAt,
        maxDownloads,
        now
      )
      .run();

    return NextResponse.json(
      {
        id: fileId,
        slug,
        url: `https://krl.kr/f/${slug}`,
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
    if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

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
      files: result.results,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[/api/v1/files GET] Error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
