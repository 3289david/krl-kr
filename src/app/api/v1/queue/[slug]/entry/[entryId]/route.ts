import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

type Ctx = { params: Promise<{ slug: string; entryId: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { slug, entryId } = await params;
  const db = getDB(request);

  const queue = await db.prepare("SELECT id FROM queues WHERE slug = ?").bind(slug).first() as Record<string, unknown> | null;
  if (!queue) return NextResponse.json({ error: "대기열 없음" }, { status: 404 });

  const entry = await db.prepare(
    "SELECT id, ticket_number, status, name, joined_at, called_at FROM queue_entries WHERE id = ? AND queue_id = ?"
  ).bind(entryId, queue.id).first() as Record<string, unknown> | null;
  if (!entry) return NextResponse.json({ error: "없음" }, { status: 404 });

  const posRow = await db.prepare(
    "SELECT COUNT(*) AS cnt FROM queue_entries WHERE queue_id = ? AND status = 'waiting' AND ticket_number <= ?"
  ).bind(queue.id, entry.ticket_number).first() as Record<string, unknown>;

  return NextResponse.json({
    status: entry.status,
    ticket_number: Number(entry.ticket_number),
    position: Number(posRow?.cnt ?? 0),
    name: entry.name,
    called_at: entry.called_at ? Number(entry.called_at) : null,
  });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { slug, entryId } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const queue = await db.prepare("SELECT * FROM queues WHERE slug = ? AND user_id = ?").bind(slug, auth.user.id).first() as Record<string, unknown> | null;
  if (!queue) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await request.json();
  const { status } = body;
  if (!["called", "done", "cancelled", "waiting"].includes(status)) {
    return NextResponse.json({ error: "잘못된 상태값입니다." }, { status: 400 });
  }

  const calledAt = status === "called" ? Date.now() : null;
  await db.prepare(
    `UPDATE queue_entries SET status = ?, called_at = COALESCE(?, called_at) WHERE id = ? AND queue_id = ?`
  ).bind(status, calledAt, entryId, queue.id).run();

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { slug, entryId } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const queue = await db.prepare("SELECT * FROM queues WHERE slug = ? AND user_id = ?").bind(slug, auth.user.id).first() as Record<string, unknown> | null;
  if (!queue) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  await db.prepare("DELETE FROM queue_entries WHERE id = ? AND queue_id = ?").bind(entryId, queue.id).run();
  return NextResponse.json({ ok: true });
}
