import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const token = randomBytes(16).toString("hex");
    const result = await pool.query(
      "UPDATE drive_files SET share_token = $1, is_shared = TRUE WHERE id = $2 AND user_id = $3 RETURNING *",
      [token, id, user.id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

    const appUrl = process.env.APP_URL ?? "https://krl.kr";
    return NextResponse.json({
      share_url: `${appUrl}/api/v1/drive/share/${token}`,
      token,
    });
  } catch (err) {
    console.error("[drive share POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    await pool.query(
      "UPDATE drive_files SET share_token = NULL, is_shared = FALSE WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[drive share DELETE]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
