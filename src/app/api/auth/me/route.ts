import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { error: "인증이 필요합니다.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const db = getDB(request);
  if (!db) {
    return NextResponse.json(
      { error: "데이터베이스 연결에 실패했습니다.", code: "DB_ERROR" },
      { status: 503 }
    );
  }

  const user = await db
    .prepare(
      "SELECT id, email, name, plan, avatar_url, created_at FROM users WHERE id = ? LIMIT 1"
    )
    .bind(session.userId)
    .first<{
      id: string;
      email: string;
      name: string | null;
      plan: string;
      avatar_url: string | null;
      created_at: number;
    }>();

  if (!user) {
    return NextResponse.json(
      { error: "사용자를 찾을 수 없습니다.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json({ user });
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: "krl_session",
    value: "",
    maxAge: 0,
    path: "/",
  });
  return response;
}
