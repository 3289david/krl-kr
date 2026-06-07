import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

// WebRTC signaling relay — publishes to target user's SSE channel
export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { type, toId, roomId, sdp, candidate } = await request.json();

    if (!toId || !type || !roomId) {
      return NextResponse.json({ error: "toId, type, roomId 필요" }, { status: 400 });
    }

    const redis = getRedis();
    await redis.publish(`chat:${toId}`, JSON.stringify({
      type: "voice_signal",
      subtype: type,   // 'offer' | 'answer' | 'ice'
      fromId: user.id,
      roomId,
      sdp,
      candidate,
    }));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[voice/signal]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
