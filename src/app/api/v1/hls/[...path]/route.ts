/**
 * HLS streaming endpoint
 *
 * Paths:
 *  /api/v1/hls/drive/{fileId}/playlist.m3u8  — Drive files (cookie auth)
 *  /api/v1/hls/drive/{fileId}/seg_NNN.ts
 *  /api/v1/hls/pub/{slug}/playlist.m3u8      — Public shared files
 *  /api/v1/hls/pub/{slug}/seg_NNN.ts
 *  /api/v1/hls/box/{itemId}/playlist.m3u8    — Box files (cookie auth)
 *  /api/v1/hls/box/{itemId}/seg_NNN.ts
 */
import { NextRequest, NextResponse } from "next/server";
import { existsSync, statSync, createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { hlsDir, hlsIsReady, queueHls, isVideo } from "@/lib/hls";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { getFilePath } from "@/lib/storage";

export const runtime = "nodejs";

function serveHlsFile(filePath: string, isM3u8: boolean): Response {
  if (!existsSync(filePath)) {
    return new Response("Not Found", { status: 404 });
  }
  const mimeType = isM3u8 ? "application/vnd.apple.mpegurl" : "video/mp2t";
  const size = statSync(filePath).size;
  const nodeStream = createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(size),
      "Cache-Control": isM3u8 ? "no-cache" : "max-age=86400",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;

  if (segments.length < 3) {
    return NextResponse.json({ error: "Invalid HLS path" }, { status: 400 });
  }

  const [type, id, filename] = segments;
  const isM3u8 = filename === "playlist.m3u8";
  const isSeg = filename.endsWith(".ts");

  if (!isM3u8 && !isSeg) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  // ── Drive files (auth required) ─────────────────────────────────────────────
  if (type === "drive") {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const r = await pool.query(
      "SELECT * FROM drive_files WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL",
      [id, user.id]
    );
    const file = r.rows[0];
    if (!file) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
    if (!isVideo(file.mime_type)) return NextResponse.json({ error: "Not a video" }, { status: 400 });

    const hlsKey = `drive_${id}`;
    if (!hlsIsReady(hlsKey)) {
      if (file.storage_path && existsSync(file.storage_path)) {
        queueHls(file.storage_path, hlsKey);
      }
      return NextResponse.json({ error: "HLS not ready yet", processing: true }, { status: 202 });
    }

    const filePath = path.join(hlsDir(hlsKey), filename);
    return serveHlsFile(filePath, isM3u8);
  }

  // ── Public shared files ──────────────────────────────────────────────────────
  if (type === "pub") {
    const db = getDB(request);
    const file = await db
      .prepare("SELECT * FROM files WHERE slug = ? LIMIT 1")
      .bind(id)
      .first<{ slug: string; storage_path: string; mime_type: string; expires_at: number | null }>();

    if (!file) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
    if (file.expires_at && Date.now() > file.expires_at) {
      return NextResponse.json({ error: "만료된 파일입니다." }, { status: 410 });
    }
    if (!isVideo(file.mime_type ?? "")) return NextResponse.json({ error: "Not a video" }, { status: 400 });

    const hlsKey = `pub_${id}`;
    if (!hlsIsReady(hlsKey)) {
      const filePath = getFilePath(file.storage_path);
      if (existsSync(filePath)) queueHls(filePath, hlsKey);
      return NextResponse.json({ error: "HLS not ready yet", processing: true }, { status: 202 });
    }

    const filePath = path.join(hlsDir(hlsKey), filename);
    return serveHlsFile(filePath, isM3u8);
  }

  // ── Box files (auth required) ────────────────────────────────────────────────
  if (type === "box") {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const r = await pool.query(
      "SELECT * FROM box_items WHERE id=$1 AND user_id=$2",
      [id, user.id]
    );
    const item = r.rows[0];
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isVideo(item.mime_type ?? "")) return NextResponse.json({ error: "Not a video" }, { status: 400 });

    const hlsKey = `box_${id}`;
    if (!hlsIsReady(hlsKey)) {
      const filePath = getFilePath(item.file_key);
      if (existsSync(filePath)) queueHls(filePath, hlsKey);
      return NextResponse.json({ error: "HLS not ready yet", processing: true }, { status: 202 });
    }

    const filePath = path.join(hlsDir(hlsKey), filename);
    return serveHlsFile(filePath, isM3u8);
  }

  // ── Room files (public — accessible to anyone with the room link) ────────────
  if (type === "room") {
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const r = await pool.query(
      "SELECT * FROM krl_room_files WHERE id=$1",
      [id]
    );
    const roomFile = r.rows[0];
    if (!roomFile) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isVideo(roomFile.mime_type ?? "")) return NextResponse.json({ error: "Not a video" }, { status: 400 });

    const hlsKey = `room_${id}`;
    if (!hlsIsReady(hlsKey)) {
      // Derive storage path from the url field: /uploads/rooms/{code}/{filename}
      const storagePath = path.join(process.cwd(), roomFile.url.replace(/^\//, ""));
      if (existsSync(storagePath)) queueHls(storagePath, hlsKey);
      return NextResponse.json({ error: "HLS not ready yet", processing: true }, { status: 202 });
    }

    const filePath = path.join(hlsDir(hlsKey), filename);
    return serveHlsFile(filePath, isM3u8);
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}

/** Quick status check: is HLS ready for a given key? */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  if (segments.length < 2) return new Response(null, { status: 400 });

  const [type, id] = segments;
  const hlsKey = `${type}_${id}`;
  const ready = hlsIsReady(hlsKey);

  return new Response(null, {
    status: ready ? 200 : 202,
    headers: { "X-HLS-Ready": String(ready) },
  });
}
