import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

// POST: mark user as online (TTL 65s — client pings every 30s)
export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const redis = getRedis();
    await redis.set(`online:${user.id}`, "1", "EX", 65);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[chat/online POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
