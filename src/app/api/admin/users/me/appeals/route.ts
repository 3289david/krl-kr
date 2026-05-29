import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ appeal: null });
  const appeal = await db
    .prepare("SELECT status, created_at FROM block_appeals WHERE user_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(session.userId)
    .first<{ status: string; created_at: number }>();
  return NextResponse.json({ appeal: appeal ?? null });
}
