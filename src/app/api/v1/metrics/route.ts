import { NextRequest, NextResponse } from "next/server";
import os from "os";
import { getPool } from "@/lib/db/postgres";
import { getSessionFromRequest } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Require authenticated session or admin secret header
  const adminSecret = process.env.METRICS_SECRET;
  const headerSecret = request.headers.get("x-metrics-secret");

  const hasHeaderAuth = adminSecret && headerSecret === adminSecret;

  if (!hasHeaderAuth) {
    // Fall back to session-based auth (must be logged in)
    const db = getDB(request);
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin-only check if ADMIN_EMAIL is set
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      // Look up user's email
      const user = await db
        .prepare("SELECT email FROM users WHERE id = ? LIMIT 1")
        .bind(session.userId)
        .first<{ email: string }>();
      if (!user || user.email !== adminEmail) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }
  const loadAvg = os.loadavg(); // [1min, 5min, 15min]
  const cpus = os.cpus().length;
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsed = totalMem - freeMem;
  const memPercent = Math.round((memUsed / totalMem) * 100);
  const uptimeSecs = os.uptime();
  const cpuLoadPct = Math.min(100, Math.round((loadAvg[0] / cpus) * 100));

  // DB ping & today's click stats
  let dbLatencyMs: number | null = null;
  let dbOk = false;
  let clicksToday = 0;
  let linksTotal = 0;

  try {
    const pool = getPool();
    const start = Date.now();
    await pool.query("SELECT 1");
    dbLatencyMs = Date.now() - start;
    dbOk = true;

    // Today's clicks (if link_clicks table exists)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTs = todayStart.getTime();

    try {
      const clickRes = await pool.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM link_clicks WHERE created_at >= $1",
        [todayTs]
      );
      clicksToday = parseInt(clickRes.rows[0]?.count ?? "0", 10);
    } catch {
      // link_clicks table might not exist or have different schema
    }

    try {
      const linksRes = await pool.query<{ count: string }>("SELECT COUNT(*) as count FROM links");
      linksTotal = parseInt(linksRes.rows[0]?.count ?? "0", 10);
    } catch {}

  } catch {
    // DB unavailable
  }

  // Redis check
  let redisOk = false;
  try {
    const { getRedis } = await import("@/lib/redis");
    await getRedis().ping();
    redisOk = true;
  } catch {
    // Redis unavailable
  }

  return NextResponse.json({
    cpu: {
      cores: cpus,
      load1: parseFloat(loadAvg[0].toFixed(2)),
      load5: parseFloat(loadAvg[1].toFixed(2)),
      load15: parseFloat(loadAvg[2].toFixed(2)),
      percent: cpuLoadPct,
    },
    memory: {
      total_mb: Math.round(totalMem / 1024 / 1024),
      used_mb: Math.round(memUsed / 1024 / 1024),
      free_mb: Math.round(freeMem / 1024 / 1024),
      percent: memPercent,
    },
    uptime: {
      seconds: Math.floor(uptimeSecs),
      hours: Math.floor(uptimeSecs / 3600),
      days: Math.floor(uptimeSecs / 86400),
    },
    clicks_today: clicksToday,
    links_total: linksTotal,
    services: {
      db: { ok: dbOk, latency_ms: dbLatencyMs },
      redis: { ok: redisOk },
    },
    timestamp: new Date().toISOString(),
  });
}
