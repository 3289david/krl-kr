import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const rows = await db.prepare(
    "SELECT j.*, n.name AS node_name FROM grid_jobs j LEFT JOIN grid_nodes n ON n.id = j.node_id WHERE j.user_id = ? ORDER BY j.created_at DESC LIMIT 50"
  ).bind(auth.user.id).all();

  return NextResponse.json({ jobs: rows.results ?? [] });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const { title, description, type = "compute", cpu_req = 1, ram_req = 1, node_id } = body;

  if (!title?.trim()) return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });

  // Find best matching available node if not specified
  let resolvedNodeId = node_id ?? null;
  if (!resolvedNodeId) {
    const bestNode = await db.prepare(
      "SELECT id FROM grid_nodes WHERE status = 'available' AND cpu_cores >= ? AND ram_gb >= ? ORDER BY cpu_cores ASC, ram_gb ASC LIMIT 1"
    ).bind(Number(cpu_req), Number(ram_req)).first() as Record<string, unknown> | null;
    if (bestNode) resolvedNodeId = bestNode.id as string;
  }

  const id = generateId("gjb");
  const now = Date.now();
  const status = resolvedNodeId ? "running" : "pending";

  await db.prepare(
    `INSERT INTO grid_jobs (id, user_id, node_id, title, description, type, cpu_req, ram_req, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, auth.user.id, resolvedNodeId, title.trim(), description ?? null, type, Number(cpu_req), Number(ram_req), status, now, now).run();

  if (resolvedNodeId && status === "running") {
    await db.prepare("UPDATE grid_nodes SET status = 'busy', updated_at = ? WHERE id = ?").bind(now, resolvedNodeId).run();
  }

  return NextResponse.json({ job: { id, title: title.trim(), type, cpu_req: Number(cpu_req), ram_req: Number(ram_req), node_id: resolvedNodeId, status, created_at: now, updated_at: now } }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const { id, status, result, result_file_id, result_file_name } = body;
  if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });

  const job = await db.prepare("SELECT * FROM grid_jobs WHERE id = ? AND user_id = ?").bind(id, auth.user.id).first() as Record<string, unknown> | null;
  if (!job) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  await db.prepare(
    `UPDATE grid_jobs SET status = COALESCE(?, status), result = COALESCE(?, result),
     result_file_id = COALESCE(?, result_file_id), result_file_name = COALESCE(?, result_file_name), updated_at = ? WHERE id = ?`
  ).bind(status ?? null, result ?? null, result_file_id ?? null, result_file_name ?? null, Date.now(), id).run();

  if (status === "done" && job.node_id) {
    await db.prepare("UPDATE grid_nodes SET status = 'available', total_hours = total_hours + 1, updated_at = ? WHERE id = ?").bind(Date.now(), job.node_id).run();
  }

  return NextResponse.json({ ok: true });
}
