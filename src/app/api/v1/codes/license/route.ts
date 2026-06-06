import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import crypto from "crypto";

export const runtime = "nodejs";

function genLicenseKey(): string {
  const seg = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${seg()}${seg()}-${seg()}${seg()}-${seg()}${seg()}-${seg()}${seg()}`;
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const result = await pool.query("SELECT * FROM license_keys WHERE user_id = $1 ORDER BY created_at DESC", [user.id]);
    return NextResponse.json({ keys: result.rows });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { label = "", product = "", max_activations = 1, expires_at = null, custom_key } = body;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    let key = custom_key?.trim().toUpperCase() || genLicenseKey();

    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 10) {
      const exists = await pool.query("SELECT id FROM license_keys WHERE key = $1", [key]);
      if (!exists.rows[0]) break;
      key = genLicenseKey();
      attempts++;
    }

    const result = await pool.query(
      "INSERT INTO license_keys (user_id, key, label, product, max_activations, activations, expires_at, active, created_at) VALUES ($1, $2, $3, $4, $5, 0, $6, TRUE, $7) RETURNING *",
      [user.id, key, label, product, max_activations, expires_at, Date.now()]
    );
    return NextResponse.json({ key: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[license POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
