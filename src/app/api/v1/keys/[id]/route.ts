import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDB(request);
  if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const result = await db
    .prepare("DELETE FROM api_keys WHERE id = ? AND user_id = ?")
    .bind(id, user.id)
    .run();

  const changes = (result.meta as { changes?: number })?.changes ?? 0;
  if (changes === 0) {
    return NextResponse.json({ error: "API 키를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
