import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { generateId } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string; key: string }> };

async function resolveStore(db: ReturnType<typeof getDB>, storeId: string, apiKey: string | null) {
  const store = await db.prepare("SELECT * FROM edgedb_stores WHERE id = ?").bind(storeId).first() as Record<string, unknown> | null;
  if (!store) return null;
  if (!store.is_public && store.api_key !== apiKey) return null;
  return store;
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id, key } = await params;
  const apiKey = request.headers.get("x-api-key") ?? request.nextUrl.searchParams.get("apikey");
  const db = getDB(request);

  const store = await resolveStore(db, id, apiKey);
  if (!store) return NextResponse.json({ error: "인증 실패 또는 스토어 없음." }, { status: 401 });

  const now = Date.now();
  const entry = await db.prepare(
    "SELECT * FROM edgedb_entries WHERE store_id = ? AND key = ? AND (expires_at IS NULL OR expires_at > ?)"
  ).bind(id, key, now).first() as Record<string, unknown> | null;

  if (!entry) return NextResponse.json({ error: "키를 찾을 수 없습니다." }, { status: 404 });

  let value: unknown = entry.value;
  if (entry.type === "json") { try { value = JSON.parse(entry.value as string); } catch { /* keep string */ } }
  else if (entry.type === "number") value = Number(entry.value);
  else if (entry.type === "boolean") value = entry.value === "true";

  return NextResponse.json({ key, value, type: entry.type, expires_at: entry.expires_at, updated_at: entry.updated_at });
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id, key } = await params;
  const apiKey = request.headers.get("x-api-key") ?? request.nextUrl.searchParams.get("apikey");
  const db = getDB(request);

  const store = await resolveStore(db, id, apiKey);
  if (!store) return NextResponse.json({ error: "인증 실패 또는 스토어 없음." }, { status: 401 });
  if (key.length > 256) return NextResponse.json({ error: "키가 너무 깁니다 (최대 256자)." }, { status: 400 });

  const body = await request.json();
  const { value, ttl } = body;
  if (value === undefined) return NextResponse.json({ error: "value가 필요합니다." }, { status: 400 });

  const valueStr = typeof value === "string" ? value : JSON.stringify(value);
  if (valueStr.length > 64 * 1024) return NextResponse.json({ error: "값이 너무 큽니다 (최대 64KB)." }, { status: 400 });

  const type = typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : typeof value === "string" ? "string" : "json";
  const expiresAt = ttl ? Date.now() + Number(ttl) * 1000 : null;
  const now = Date.now();

  const existing = await db.prepare("SELECT id FROM edgedb_entries WHERE store_id = ? AND key = ?").bind(id, key).first();
  if (existing) {
    await db.prepare("UPDATE edgedb_entries SET value = ?, type = ?, expires_at = ?, updated_at = ? WHERE store_id = ? AND key = ?")
      .bind(valueStr, type, expiresAt, now, id, key).run();
  } else {
    await db.prepare(
      "INSERT INTO edgedb_entries (id, store_id, key, value, type, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(generateId("ede"), id, key, valueStr, type, expiresAt, now, now).run();
  }

  return NextResponse.json({ ok: true, key, type, expires_at: expiresAt });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id, key } = await params;
  const apiKey = request.headers.get("x-api-key") ?? request.nextUrl.searchParams.get("apikey");
  const db = getDB(request);

  const store = await resolveStore(db, id, apiKey);
  if (!store) return NextResponse.json({ error: "인증 실패 또는 스토어 없음." }, { status: 401 });

  await db.prepare("DELETE FROM edgedb_entries WHERE store_id = ? AND key = ?").bind(id, key).run();
  return NextResponse.json({ ok: true });
}
