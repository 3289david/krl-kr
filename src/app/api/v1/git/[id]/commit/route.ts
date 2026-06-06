import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { message, files = [] } = body;
    if (!message) return NextResponse.json({ error: "커밋 메시지가 필요합니다." }, { status: 400 });

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    const repo = await pool.query("SELECT id FROM git_repos WHERE id = $1 AND user_id = $2", [id, user.id]);
    if (!repo.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = Date.now();

    // Upsert all files
    for (const file of files as { path: string; content: string }[]) {
      await pool.query(
        `INSERT INTO git_files (repo_id, path, content, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (repo_id, path) DO UPDATE SET content = $3, updated_at = $4`,
        [id, file.path, file.content, now]
      );
    }

    // Create commit record
    const commit = await pool.query(
      "INSERT INTO git_commits (repo_id, user_id, message, files_changed, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [id, user.id, message, files.length, now]
    );

    // Update repo updated_at
    await pool.query("UPDATE git_repos SET updated_at = $1 WHERE id = $2", [now, id]);

    return NextResponse.json({ commit: commit.rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
