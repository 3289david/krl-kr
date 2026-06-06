import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const result = await pool.query("SELECT * FROM space_sites WHERE user_id = $1 ORDER BY created_at DESC", [user.id]);
    return NextResponse.json({ sites: result.rows });
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
    const { slug, name, description = "", theme = "default", primary_color = "#6366f1" } = body;
    if (!slug || !name) return NextResponse.json({ error: "슬러그와 이름이 필요합니다." }, { status: 400 });

    // Validate slug
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: "슬러그는 영문 소문자, 숫자, 하이픈만 사용 가능합니다." }, { status: 400 });
    }

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    // Check uniqueness
    const existing = await pool.query("SELECT id FROM space_sites WHERE slug = $1", [slug]);
    if (existing.rows[0]) return NextResponse.json({ error: "이미 사용 중인 슬러그입니다." }, { status: 409 });

    const now = Date.now();
    const result = await pool.query(
      "INSERT INTO space_sites (user_id, slug, name, description, theme, primary_color, is_public, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, $7) RETURNING *",
      [user.id, slug, name, description, theme, primary_color, now]
    );
    return NextResponse.json({ site: result.rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
