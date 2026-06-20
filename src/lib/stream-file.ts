import { createReadStream, existsSync, statSync } from "fs";
import { Readable } from "stream";

export function streamFile(
  filePath: string,
  mimeType: string,
  rangeHeader: string | null,
  disposition?: string
): Response {
  if (!existsSync(filePath)) {
    return new Response("Not Found", { status: 404 });
  }

  const fileSize = statSync(filePath).size;

  // X-Accel-Buffering: no tells nginx NOT to buffer this response —
  // critical for video seek/streaming to work through the nginx proxy.
  const baseHeaders: Record<string, string> = {
    "Content-Type": mimeType,
    "Accept-Ranges": "bytes",
    "X-Accel-Buffering": "no",
  };
  if (disposition) baseHeaders["Content-Disposition"] = disposition;

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (!match) {
      return new Response("Invalid Range", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

    if (start > end || end >= fileSize) {
      return new Response("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const nodeStream = createReadStream(filePath, { start, end });
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new Response(webStream, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const nodeStream = createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new Response(webStream, {
    headers: { ...baseHeaders, "Content-Length": String(fileSize) },
  });
}
