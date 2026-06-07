import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { makeSubRedis } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const encoder = new TextEncoder();
  const sub = makeSubRedis();
  const channel = `chat:${user.id}`;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      sub.subscribe(channel, (err) => {
        if (err) {
          console.error("[chat SSE] subscribe error", err);
          try { ctrl.close(); } catch {}
          sub.disconnect();
        }
      });

      sub.on("message", (_ch: string, msg: string) => {
        try {
          ctrl.enqueue(encoder.encode(`data: ${msg}\n\n`));
        } catch {}
      });

      // Heartbeat every 25s (nginx proxy_read_timeout is 300s)
      const hb = setInterval(() => {
        try {
          ctrl.enqueue(encoder.encode(`:ping\n\n`));
        } catch {
          clearInterval(hb);
        }
      }, 25000);

      request.signal.addEventListener("abort", () => {
        clearInterval(hb);
        sub.unsubscribe(channel).catch(() => {});
        sub.disconnect();
        try { ctrl.close(); } catch {}
      });
    },
    cancel() {
      sub.unsubscribe(channel).catch(() => {});
      sub.disconnect();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
