import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { generateId } from "@/lib/utils";
import { checkRateLimit } from "@/lib/auth";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const db = getDB(request);

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit({ key: `queue:${ip}`, limit: 10, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });

  const queue = await db.prepare("SELECT * FROM queues WHERE slug = ?").bind(slug).first() as Record<string, unknown> | null;
  if (!queue) return NextResponse.json({ error: "존재하지 않는 대기열입니다." }, { status: 404 });
  if (!queue.is_active) return NextResponse.json({ error: "현재 대기열이 비활성화되어 있습니다." }, { status: 410 });

  const body = await request.json();
  const { name, phone, note } = body;
  if (!name?.trim()) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });

  const maxSize = Number(queue.max_size) || 0;
  if (maxSize > 0) {
    const countRow = await db.prepare("SELECT COUNT(*) AS cnt FROM queue_entries WHERE queue_id = ? AND status = 'waiting'").bind(queue.id).first() as Record<string, unknown>;
    if (Number(countRow?.cnt ?? 0) >= maxSize) return NextResponse.json({ error: "대기열이 가득 찼습니다." }, { status: 409 });
  }

  const maxTicketRow = await db.prepare("SELECT MAX(ticket_number) AS max_t FROM queue_entries WHERE queue_id = ?").bind(queue.id).first() as Record<string, unknown>;
  const ticketNumber = (Number(maxTicketRow?.max_t ?? 0)) + 1;

  const posRow = await db.prepare("SELECT COUNT(*) AS cnt FROM queue_entries WHERE queue_id = ? AND status = 'waiting'").bind(queue.id).first() as Record<string, unknown>;
  const position = (Number(posRow?.cnt ?? 0)) + 1;

  const id = generateId("qe");
  const now = Date.now();

  await db.prepare(
    `INSERT INTO queue_entries (id, queue_id, name, phone, ticket_number, status, note, joined_at)
     VALUES (?, ?, ?, ?, ?, 'waiting', ?, ?)`
  ).bind(id, queue.id, name.trim(), phone?.trim() ?? null, ticketNumber, note?.trim() ?? null, now).run();

  return NextResponse.json({ ok: true, id, ticket_number: ticketNumber, position, queue_name: queue.name }, { status: 201 });
}
