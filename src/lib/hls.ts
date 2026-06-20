import { spawn } from "child_process";
import { mkdirSync, existsSync, rmSync, writeFileSync, unlinkSync } from "fs";
import path from "path";

// Stored outside /uploads/ so nginx doesn't serve these directly (security)
export const HLS_BASE = path.join(process.cwd(), "hls_cache");

export const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/x-flv",
  "video/3gpp",
  "video/mpeg",
  "video/x-ms-wmv",
  "video/x-m4v",
]);

export function isVideo(mimeType: string): boolean {
  return VIDEO_TYPES.has(mimeType) || mimeType.startsWith("video/");
}

export function hlsDir(hlsKey: string): string {
  return path.join(HLS_BASE, hlsKey);
}

export function hlsPlaylistPath(hlsKey: string): string {
  return path.join(HLS_BASE, hlsKey, "playlist.m3u8");
}

export function hlsIsReady(hlsKey: string): boolean {
  return existsSync(hlsPlaylistPath(hlsKey));
}

/** Fire-and-forget HLS transcoding. Silently ignores if already running or done. */
export function queueHls(inputPath: string, hlsKey: string): void {
  if (hlsIsReady(hlsKey)) return;

  const lockPath = path.join(HLS_BASE, `${hlsKey}.lock`);
  if (existsSync(lockPath)) return; // already transcoding

  const outDir = hlsDir(hlsKey);
  mkdirSync(HLS_BASE, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  try { writeFileSync(lockPath, String(Date.now())); } catch { return; }

  const playlist = path.join(outDir, "playlist.m3u8");
  const segPattern = path.join(outDir, "seg_%03d.ts");

  function cleanup() {
    try { unlinkSync(lockPath); } catch {}
  }

  // Try stream copy first (fast, no quality loss)
  const copyArgs = [
    "-y", "-i", inputPath,
    "-c", "copy",
    "-start_number", "0",
    "-hls_time", "6",
    "-hls_list_size", "0",
    "-hls_segment_filename", segPattern,
    "-f", "hls", playlist,
  ];

  const proc = spawn("ffmpeg", copyArgs, { stdio: "ignore", detached: true });
  proc.unref();

  proc.on("close", (code) => {
    if (code === 0) { cleanup(); return; }

    // Fallback: re-encode to H.264/AAC (handles non-streamable containers)
    try { rmSync(outDir, { recursive: true, force: true }); } catch {}
    mkdirSync(outDir, { recursive: true });

    const encodeArgs = [
      "-y", "-i", inputPath,
      "-c:v", "libx264", "-preset", "fast", "-crf", "23",
      "-c:a", "aac", "-b:a", "128k",
      "-start_number", "0",
      "-hls_time", "6",
      "-hls_list_size", "0",
      "-hls_segment_filename", segPattern,
      "-f", "hls", playlist,
    ];

    const proc2 = spawn("ffmpeg", encodeArgs, { stdio: "ignore", detached: true });
    proc2.unref();
    proc2.on("close", cleanup);
  });
}
