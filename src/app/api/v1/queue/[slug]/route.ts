import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);

  const queue = await db.prepare("SELECT * FROM queues WHERE slug = ?").bind(slug).first() as Record<string, unknown> | null;
  if (!queue) return NextResponse.json({ error: "존재하지 않는 대기열입니다." }, { status: 404 });

  await db.prepare("UPDATE queues SET view_count = view_count + 1 WHERE id = ?").bind(queue.id).run();

  const entries = await db.prepare(
    "SELECT * FROM queue_entries WHERE queue_id = ? AND status = 'waiting' ORDER BY ticket_number ASC"
  ).bind(queue.id).all();

  const auth = await requireAuth(db, request);
  const isOwner = !auth.error && auth.user?.id === queue.user_id;

  const allEntries = isOwner
    ? (await db.prepare("SELECT * FROM queue_entries WHERE queue_id = ? ORDER BY ticket_number ASC").bind(queue.id).all()).results ?? []
    : entries.results ?? [];

  return NextResponse.json({ queue, entries: allEntries, waiting: entries.results?.length ?? 0 });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const queue = await db.prepare("SELECT * FROM queues WHERE slug = ? AND user_id = ?").bind(slug, auth.user.id).first() as Record<string, unknown> | null;
  if (!queue) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await request.json();
  const { name, description, max_size, is_active } = body;

  await db.prepare(
    `UPDATE queues SET name = COALESCE(?, name), description = COALESCE(?, description),
     max_size = COALESCE(?, max_size), is_active = COALESCE(?, is_active), updated_at = ? WHERE id = ?`
  ).bind(name ?? null, description ?? null, max_size != null ? Number(max_size) : null, is_active != null ? (is_active ? 1 : 0) : null, Date.now(), queue.id).run();

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const queue = await db.prepare("SELECT * FROM queues WHERE slug = ? AND user_id = ?").bind(slug, auth.user.id).first() as Record<string, unknown> | null;
  if (!queue) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  await db.prepare("DELETE FROM queue_entries WHERE queue_id = ?").bind(queue.id).run();
  await db.prepare("DELETE FROM queues WHERE id = ?").bind(queue.id).run();

  return NextResponse.json({ ok: true });
}
