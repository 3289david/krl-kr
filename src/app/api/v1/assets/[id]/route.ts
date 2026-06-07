import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { unlink, rmdir } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

const UPLOAD_BASE = join(process.cwd(), "uploads", "cdn");

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB(request);
  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  const body = await request.json() as Record<string, unknown>;
  const allowed = ["title", "project", "active"] as const;
  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;
  for (const k of allowed) {
    if (k in body) { sets.push(`${k}=$${idx++}`); vals.push(body[k]); }
  }
  if (!sets.length) return NextResponse.json({ error: "변경할 필드가 없습니다." }, { status: 400 });
  vals.push(id, user.id);
  const r = await pool.query(
    `UPDATE cdn_assets SET ${sets.join(",")} WHERE id=$${idx++} AND user_id=$${idx} RETURNING *`,
    vals
  );
  if (!r.rows[0]) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ success: true, asset: r.rows[0] });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB(request);
  const { user, error: authErr } = await requireAuth(db, request);
  if (authErr) return authErr;

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  const r = await pool.query("SELECT code, filename FROM cdn_assets WHERE id=$1 AND user_id=$2", [id, user.id]);
  const asset = r.rows[0];
  if (!asset) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

  try {
    await unlink(join(UPLOAD_BASE, asset.code, asset.filename));
    await rmdir(join(UPLOAD_BASE, asset.code)).catch(() => {});
  } catch {}

  await pool.query("DELETE FROM cdn_assets WHERE id=$1", [id]);
  return NextResponse.json({ success: true });
}
