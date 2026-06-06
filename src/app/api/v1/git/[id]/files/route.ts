import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    // Verify ownership
    const repo = await pool.query("SELECT id FROM git_repos WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!repo.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await pool.query("SELECT * FROM git_files WHERE repo_id = $1 ORDER BY path", [id]);
    return NextResponse.json({ files: result.rows });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { path, content = "", commit_message } = body;
    if (!path) return NextResponse.json({ error: "경로가 필요합니다." }, { status: 400 });

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const repo = await pool.query("SELECT id FROM git_repos WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!repo.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = Date.now();
    const result = await pool.query(
      `INSERT INTO git_files (repo_id, path, content, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (repo_id, path) DO UPDATE SET content = $3, updated_at = $4
       RETURNING *`,
      [id, path, content, now]
    );

    // Auto-create commit record if table exists
    try {
      const msg = commit_message || `Update ${path}`;
      await pool.query(
        `INSERT INTO git_commits (repo_id, user_id, message, files_changed, created_at) VALUES ($1, $2, $3, 1, $4)`,
        [id, user.id, msg, now]
      );
      await pool.query(`UPDATE git_repos SET updated_at = $1 WHERE id = $2`, [now, id]);
    } catch { /* commits table might not exist, ignore */ }

    return NextResponse.json({ file: result.rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { path } = body;
    if (!path) return NextResponse.json({ error: "경로가 필요합니다." }, { status: 400 });

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const repo = await pool.query("SELECT id FROM git_repos WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!repo.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await pool.query("DELETE FROM git_files WHERE repo_id = $1 AND path = $2", [id, path]);

    // Auto-create commit for deletion
    try {
      const now = Date.now();
      await pool.query(
        `INSERT INTO git_commits (repo_id, user_id, message, files_changed, created_at) VALUES ($1, $2, $3, 1, $4)`,
        [id, user.id, `Delete ${path}`, now]
      );
    } catch { /* ignore */ }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
