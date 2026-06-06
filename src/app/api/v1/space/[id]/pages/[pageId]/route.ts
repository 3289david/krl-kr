import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; pageId: string }> }) {
  try {
    const { id, pageId } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const site = await pool.query("SELECT id FROM space_sites WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!site.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await pool.query("SELECT * FROM space_pages WHERE id = $1 AND site_id = $2", [pageId, id]);
    if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ page: result.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; pageId: string }> }) {
  try {
    const { id, pageId } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const site = await pool.query("SELECT id FROM space_sites WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!site.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const key of ["title", "seo_title", "seo_description", "is_published", "sort_order"]) {
      if (key in body) { fields.push(`${key} = $${idx++}`); values.push(body[key]); }
    }
    if ("content" in body) { fields.push(`content = $${idx++}`); values.push(JSON.stringify(body.content)); }
    fields.push(`updated_at = $${idx++}`);
    values.push(Date.now());
    values.push(pageId);
    values.push(id);

    const result = await pool.query(
      `UPDATE space_pages SET ${fields.join(", ")} WHERE id = $${idx++} AND site_id = $${idx} RETURNING *`,
      values
    );
    if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ page: result.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; pageId: string }> }) {
  try {
    const { id, pageId } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const site = await pool.query("SELECT id FROM space_sites WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!site.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await pool.query("DELETE FROM space_pages WHERE id = $1 AND site_id = $2", [pageId, id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
