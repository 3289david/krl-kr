import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

const UPLOAD_BASE = join(process.cwd(), "uploads", "cdn");

// Lightweight view tracking — fire-and-forget from nginx subrequest
export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  // path = ["u", code, filename] or ["p", project, filename]
  const [, code] = path;
  if (!code) return NextResponse.json({ ok: false });

  try {
    const body = await request.json() as { ip?: string; referer?: string; ua?: string; bytes?: number };
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const r = await pool.query("SELECT id, size FROM cdn_assets WHERE code=$1 AND active=TRUE", [code]);
    if (!r.rows[0]) return NextResponse.json({ ok: false });
    const asset = r.rows[0];
    const bytes = body.bytes ?? asset.size ?? 0;
    await pool.query(
      "INSERT INTO cdn_views (asset_id, ip, referer, ua, bytes, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
      [asset.id, body.ip ?? "", body.referer ?? "", body.ua ?? "", bytes, Date.now()]
    );
    await pool.query(
      "UPDATE cdn_assets SET views=views+1, bandwidth=bandwidth+$1 WHERE id=$2",
      [bytes, asset.id]
    );
  } catch {}
  return NextResponse.json({ ok: true });
}
