import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { ensureBlogTables, deleteBlogDnsRecord } from "../route";

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
    const { title, description, theme, primary_color, font, custom_css, is_public, footer_text, custom_domain } = body;

    // Normalize custom_domain: strip protocol, lowercase, null if empty
    let cleanDomain: string | null = null;
    if (custom_domain && typeof custom_domain === "string" && custom_domain.trim()) {
      cleanDomain = custom_domain.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
    }

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
        custom_domain = $9,
        updated_at = $10
       WHERE id = $11 AND user_id = $12 RETURNING *`,
      [title, description, theme, primary_color, font, custom_css, is_public, footer_text, cleanDomain, Date.now(), id, user.id]
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

    const blogRow = await pool.query("SELECT cf_dns_record_id FROM blogs WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (blogRow.rows[0]?.cf_dns_record_id) {
      await deleteBlogDnsRecord(blogRow.rows[0].cf_dns_record_id);
    }

    await pool.query("DELETE FROM blogs WHERE id = $1 AND user_id = $2", [id, user.id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[blog/[id] DELETE]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
