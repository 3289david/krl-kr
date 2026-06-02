import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id } = await params;
  const { slug, title, excerpt, content, cover_image, status, tags } = await request.json();

  const cleanSlug = slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");

  try {
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const now = Date.now();

    const cur = await pool.query(`SELECT status, published_at FROM blog_posts WHERE id=$1`, [id]);
    const wasPublished = cur.rows[0]?.status === "published";
    const publishedAt = wasPublished ? cur.rows[0].published_at : (status === "published" ? now : null);

    await pool.query(
      `UPDATE blog_posts SET slug=$1, title=$2, excerpt=$3, content=$4, cover_image=$5,
       status=$6, tags=$7, updated_at=$8, published_at=$9 WHERE id=$10`,
      [cleanSlug, title?.trim(), excerpt?.trim() || null, content?.trim(), cover_image || null,
       status, tags?.trim() || null, now, publishedAt, id]
    );
    return NextResponse.json({ ok: true, slug: cleanSlug });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "23505") {
      return NextResponse.json({ error: "이미 사용 중인 슬러그입니다." }, { status: 409 });
    }
    console.error("Blog update error:", e);
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  const check = await requireAdmin(db, session);
  if (!check.ok) return check.response;

  const { id } = await params;

  try {
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    await pool.query(`DELETE FROM blog_posts WHERE id=$1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Blog delete error:", e);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
