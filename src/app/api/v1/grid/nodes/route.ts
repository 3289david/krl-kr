import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const mine = request.nextUrl.searchParams.get("mine") === "1";

  if (mine) {
    const auth = await requireAuth(db, request);
    if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    const rows = await db.prepare("SELECT * FROM grid_nodes WHERE user_id = ? ORDER BY created_at DESC").bind(auth.user.id).all();
    return NextResponse.json({ nodes: rows.results ?? [] });
  }

  const rows = await db.prepare("SELECT * FROM grid_nodes WHERE status = 'available' ORDER BY cpu_cores DESC, ram_gb DESC LIMIT 50").all();
  return NextResponse.json({ nodes: rows.results ?? [] });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const { name, cpu_cores, ram_gb, os, available_from, available_to } = body;

  if (!name?.trim()) return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  if (!cpu_cores || Number(cpu_cores) < 1) return NextResponse.json({ error: "CPU 코어 수를 입력해주세요." }, { status: 400 });
  if (!ram_gb || Number(ram_gb) < 0.5) return NextResponse.json({ error: "RAM 용량을 입력해주세요." }, { status: 400 });

  const id = generateId("gnd");
  const now = Date.now();

  await db.prepare(
    `INSERT INTO grid_nodes (id, user_id, username, name, cpu_cores, ram_gb, os, available_from, available_to, status, total_hours, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', 0, ?, ?)`
  ).bind(id, auth.user.id, auth.user.username ?? null, name.trim(), Number(cpu_cores), Number(ram_gb), os ?? null, available_from ?? null, available_to ?? null, now, now).run();

  return NextResponse.json({ node: { id, name: name.trim(), cpu_cores: Number(cpu_cores), ram_gb: Number(ram_gb), os, available_from, available_to, status: "available", total_hours: 0, created_at: now, updated_at: now } }, { status: 201 });
}
