import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId, generateSlug, isValidSlug } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const rows = await db.prepare(
    `SELECT q.*, (SELECT COUNT(*) FROM queue_entries e WHERE e.queue_id = q.id AND e.status = 'waiting') AS waiting_count
     FROM queues q WHERE q.user_id = ? ORDER BY q.created_at DESC`
  ).bind(auth.user.id).all();

  return NextResponse.json({ queues: rows.results ?? [] });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const { name, description, max_size = 0 } = body;
  let { slug } = body;

  if (!name?.trim()) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });

  if (slug?.trim()) {
    const { valid, reason } = isValidSlug(slug);
    if (!valid) return NextResponse.json({ error: reason }, { status: 400 });
    const existing = await db.prepare("SELECT id FROM queues WHERE slug = ?").bind(slug).first();
    if (existing) return NextResponse.json({ error: "이미 사용 중인 슬러그입니다." }, { status: 409 });
  } else {
    slug = generateSlug(8);
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.prepare("SELECT id FROM queues WHERE slug = ?").bind(slug).first();
      if (!existing) break;
      slug = generateSlug(8);
      attempts++;
    }
  }

  const id = generateId("que");
  const now = Date.now();

  await db.prepare(
    `INSERT INTO queues (id, user_id, slug, name, description, max_size, is_active, view_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`
  ).bind(id, auth.user.id, slug, name.trim(), description ?? null, Number(max_size) || 0, now, now).run();

  return NextResponse.json({ queue: { id, slug, name: name.trim(), description, max_size: Number(max_size) || 0, is_active: 1, view_count: 0, waiting_count: 0 } }, { status: 201 });
}
