import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { generateId } from "@/lib/utils";
import { getPool } from "@/lib/db/postgres";
import { checkStorageQuota } from "@/lib/storage-quota";
import fs from "fs";

export const runtime = "nodejs";

const WORKSPACE_ROOT = "/var/www/krl-kr/workspaces";

const PLAN_WORKSPACE_LIMITS: Record<string, number> = {
  free: 1,
  pro: 5,
  vip: 20,
};

const PLAN_DISK_LIMITS: Record<string, number> = {
  free: 512 * 1024 * 1024,    // 512 MB
  pro: 5 * 1024 ** 3,         // 5 GB
  vip: 20 * 1024 ** 3,        // 20 GB
};

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const res = await pool.query(
      "SELECT * FROM workspaces WHERE user_id=$1 AND status!='deleted' ORDER BY updated_at DESC",
      [user.id]
    );

    const planRes = await pool.query(
      "SELECT plan FROM user_plans WHERE user_id=$1",
      [user.id]
    );
    const plan = planRes.rows[0]?.plan ?? "free";

    return NextResponse.json({
      workspaces: res.rows,
      plan,
      limits: {
        max_workspaces: PLAN_WORKSPACE_LIMITS[plan] ?? 1,
        disk_per_workspace: PLAN_DISK_LIMITS[plan] ?? PLAN_DISK_LIMITS.free,
      },
    });
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
    const { name, description } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: "이름을 입력하세요." }, { status: 400 });
    }

    const pool = await getPool();

    // Check plan workspace limit
    const planRes = await pool.query("SELECT plan FROM user_plans WHERE user_id=$1", [user.id]);
    const plan = planRes.rows[0]?.plan ?? "free";
    const maxWorkspaces = PLAN_WORKSPACE_LIMITS[plan] ?? 1;

    const countRes = await pool.query(
      "SELECT COUNT(*) AS cnt FROM workspaces WHERE user_id=$1 AND status!='deleted'",
      [user.id]
    );
    if (Number(countRes.rows[0].cnt) >= maxWorkspaces) {
      return NextResponse.json(
        { error: `플랜 한도 초과: ${plan} 플랜은 최대 ${maxWorkspaces}개의 워크스페이스를 사용할 수 있습니다.` },
        { status: 403 }
      );
    }

    // Check storage quota (initial workspace directory ~1 MB estimate)
    const quota = await checkStorageQuota(pool, user.id, 1024 * 1024);
    if (!quota.ok) {
      return NextResponse.json({ error: "저장 공간이 부족합니다." }, { status: 403 });
    }

    const id = generateId("ws");
    const dirPath = `${WORKSPACE_ROOT}/${user.id}/${id}`;
    fs.mkdirSync(dirPath, { recursive: true });
    // krl-worker가 쓸 수 있도록 소유권 설정
    try { fs.chownSync(dirPath, 997, 982); fs.chmodSync(dirPath, 0o750); } catch {}

    const now = Date.now();
    await pool.query(
      `INSERT INTO workspaces (id, user_id, name, description, dir_path, disk_bytes, created_at, updated_at, status)
       VALUES ($1,$2,$3,$4,$5,0,$6,$6,'active')`,
      [id, user.id, name.trim(), description ?? null, dirPath, now]
    );

    return NextResponse.json({
      workspace: { id, user_id: user.id, name: name.trim(), description: description ?? null, dir_path: dirPath, disk_bytes: 0, created_at: now, updated_at: now, status: "active" },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
