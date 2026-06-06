import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { ensureBlogTables } from "../route";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const result = await pool.query(
      "SELECT * FROM blogs WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: "블로그를 찾을 수 없습니다." }, { status: 404 });

    return NextResponse.json({ blog: result.rows[0] });
  } catch (err) {
    console.error("[blog/[id] GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    await ensureBlogTables(pool);

    const body = await request.json();
    const { title, description, theme, primary_color, font, custom_css, is_public, footer_text } = body;

    const result = await pool.query(
      `UPDATE blogs SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        theme = COALESCE($3, theme),
        primary_color = COALESCE($4, primary_color),
        font = COALESCE($5, font),
        custom_css = COALESCE($6, custom_css),
        is_public = COALESCE($7, is_public),
        footer_text = COALESCE($8, footer_text),
        updated_at = $9
       WHERE id = $10 AND user_id = $11 RETURNING *`,
      [title, description, theme, primary_color, font, custom_css, is_public, footer_text, Date.now(), id, user.id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: "블로그를 찾을 수 없습니다." }, { status: 404 });

    return NextResponse.json({ blog: result.rows[0] });
  } catch (err) {
    console.error("[blog/[id] PATCH]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    await pool.query("DELETE FROM blogs WHERE id = $1 AND user_id = $2", [id, user.id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[blog/[id] DELETE]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
