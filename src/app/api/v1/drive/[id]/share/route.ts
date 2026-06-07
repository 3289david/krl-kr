import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB(request);
  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  const body = await request.json().catch(() => ({})) as { password?: string; expires_days?: number };
  const token = randomBytes(20).toString("hex");
  const expiresAt = body.expires_days ? Date.now() + body.expires_days * 86400_000 : null;
  const password = body.password?.trim() || null;

  const r = await pool.query(
    `UPDATE drive_files
     SET share_token=$1, is_shared=TRUE, share_password=$2, share_expires_at=$3
     WHERE id=$4 AND user_id=$5 RETURNING *`,
    [token, password, expiresAt, id, user.id]
  );
  if (!r.rows[0]) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

  const appUrl = process.env.APP_URL ?? "https://krl.kr";
  const file = r.rows[0];
  return NextResponse.json({
    share_url: `${appUrl}/drive/share/${token}`,
    token,
    type: file.type,
    password_protected: !!password,
    expires_at: expiresAt,
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB(request);
  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(
    "UPDATE drive_files SET share_token=NULL, is_shared=FALSE, share_password=NULL, share_expires_at=NULL WHERE id=$1 AND user_id=$2",
    [id, user.id]
  );
  return NextResponse.json({ success: true });
}
