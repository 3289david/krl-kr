import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { getPool } from "@/lib/db/postgres";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const res = await pool.query(
      "SELECT api_key FROM workspace_anthropic_keys WHERE user_id=$1",
      [user.id]
    );

    if (!res.rows.length) return NextResponse.json({ has_key: false });

    const key = res.rows[0].api_key as string;
    // Mask the key
    const masked = key.slice(0, 10) + "..." + key.slice(-4);
    return NextResponse.json({ has_key: true, masked });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { api_key } = body;
    if (!api_key || !api_key.startsWith("sk-ant-")) {
      return NextResponse.json({ error: "유효한 Anthropic API 키를 입력하세요. (sk-ant- 로 시작)" }, { status: 400 });
    }

    const pool = await getPool();
    const now = Date.now();
    await pool.query(
      `INSERT INTO workspace_anthropic_keys (user_id, api_key, created_at, updated_at)
       VALUES ($1,$2,$3,$3)
       ON CONFLICT (user_id) DO UPDATE SET api_key=$2, updated_at=$3`,
      [user.id, api_key, now]
    );

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    await pool.query("DELETE FROM workspace_anthropic_keys WHERE user_id=$1", [user.id]);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
