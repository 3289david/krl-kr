import { NextRequest } from "next/server";
import { makeSubRedis } from "@/lib/chat";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const encoder = new TextEncoder();
  let sub: any = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      sub = makeSubRedis();
      sub.subscribe(`krl_room:${code}`, (err: any) => {
        if (err) { controller.close(); return; }
      });

      sub.on("message", (_channel: string, data: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(`data: ${data}\n\n`)); } catch {}
      });

      // Heartbeat every 25s
      const hb = setInterval(() => {
        if (closed) { clearInterval(hb); return; }
        try { controller.enqueue(encoder.encode(": heartbeat\n\n")); } catch { clearInterval(hb); }
      }, 25000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(hb);
        try { sub?.disconnect(); } catch {}
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      closed = true;
      try { sub?.disconnect(); } catch {}
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
