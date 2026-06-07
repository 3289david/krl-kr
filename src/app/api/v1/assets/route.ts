import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import crypto from "crypto";

export const runtime = "nodejs";

const UPLOAD_BASE = "/var/www/krl-kr/uploads/cdn";
const MAX_SIZE_FREE = 200 * 1024 * 1024; // 200 MB

const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function genCode(len = 8) {
  return Array.from(crypto.randomBytes(len)).map(b => CHARS[b % CHARS.length]).join("");
}

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  const { searchParams } = new URL(request.url);
  const project = searchParams.get("project") ?? "";

  const q = project
    ? "SELECT * FROM cdn_assets WHERE user_id=$1 AND project=$2 AND active=TRUE ORDER BY created_at DESC"
    : "SELECT * FROM cdn_assets WHERE user_id=$1 AND active=TRUE ORDER BY created_at DESC";
  const args = project ? [user.id, project] : [user.id];
  const result = await pool.query(q, args);

  const projectsQ = await pool.query(
    "SELECT DISTINCT project FROM cdn_assets WHERE user_id=$1 AND project!='' AND active=TRUE ORDER BY project",
    [user.id]
  );

  const totals = await pool.query(
    "SELECT COALESCE(SUM(size),0) AS storage, COALESCE(SUM(views),0) AS views, COALESCE(SUM(bandwidth),0) AS bandwidth FROM cdn_assets WHERE user_id=$1 AND active=TRUE",
    [user.id]
  );

  return NextResponse.json({
    assets: result.rows,
    projects: projectsQ.rows.map(r => r.project),
    stats: totals.rows[0],
  });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const { user, error } = await requireAuth(db, request);
  if (error) return error;

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const project = (formData.get("project") as string | null)?.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "") ?? "";

  if (!file) return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
  if (file.size > MAX_SIZE_FREE) return NextResponse.json({ error: "파일 크기가 200MB를 초과합니다." }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  let code = genCode();
  // ensure uniqueness
  for (let i = 0; i < 5; i++) {
    const ex = await pool.query("SELECT id FROM cdn_assets WHERE code=$1", [code]);
    if (!ex.rows[0]) break;
    code = genCode();
  }

  const safeOriginal = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dir = join(UPLOAD_BASE, code);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, safeOriginal), buffer);

  const result = await pool.query(
    `INSERT INTO cdn_assets (user_id, code, filename, original_name, mime_type, size, project, title, views, bandwidth, active, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,0,TRUE,$9) RETURNING *`,
    [user.id, code, safeOriginal, file.name, file.type || "application/octet-stream", file.size, project, title, Date.now()]
  );

  const asset = result.rows[0];
  return NextResponse.json({
    success: true,
    asset,
    cdn_url: `https://cdn.krl.kr/u/${code}/${safeOriginal}`,
  }, { status: 201 });
}
