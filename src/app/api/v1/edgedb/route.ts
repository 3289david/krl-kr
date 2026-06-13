import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const rows = await db.prepare(
    `SELECT s.*, (SELECT COUNT(*) FROM edgedb_entries e WHERE e.store_id = s.id) AS entry_count
     FROM edgedb_stores s WHERE s.user_id = ? ORDER BY s.created_at DESC`
  ).bind(auth.user.id).all();

  return NextResponse.json({ stores: rows.results ?? [] });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const { name, description, is_public = 0 } = body;
  if (!name?.trim()) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });

  const id = generateId("edb");
  const apiKey = `edb_${randomBytes(24).toString("hex")}`;
  const now = Date.now();

  await db.prepare(
    `INSERT INTO edgedb_stores (id, user_id, name, description, api_key, is_public, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, auth.user.id, name.trim(), description ?? null, apiKey, is_public ? 1 : 0, now, now).run();

  return NextResponse.json({ store: { id, name: name.trim(), description, api_key: apiKey, is_public, entry_count: 0 } }, { status: 201 });
}
