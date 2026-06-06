import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { generateShareToken } from "@/lib/share";

export const runtime = "nodejs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://krl.kr";

// Map type → { table, ownership column }
const TYPE_MAP: Record<string, { table: string; ownerCol: string }> = {
  note:        { table: "notes",          ownerCol: "user_id" },
  doc:         { table: "krl_docs",       ownerCol: "user_id" },
  wiki:        { table: "wikis",          ownerCol: "user_id" },
  whiteboard:  { table: "whiteboards",    ownerCol: "user_id" },
  git:         { table: "git_repos",      ownerCol: "user_id" },
  form:        { table: "krl_forms",      ownerCol: "user_id" },
  project:     { table: "tasks_projects", ownerCol: "user_id" },
  calendar:    { table: "calendars",      ownerCol: "user_id" },
  study_goal:  { table: "study_goals",    ownerCol: "user_id" },
  box:         { table: "box_items",      ownerCol: "user_id" },
  space:       { table: "space_sites",    ownerCol: "user_id" },
};

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const body = await request.json();
    const { type, id, is_public } = body as { type: string; id: number; is_public: boolean };

    if (!type || id == null) {
      return NextResponse.json({ error: "type과 id가 필요합니다." }, { status: 400 });
    }

    const mapping = TYPE_MAP[type];
    if (!mapping) {
      return NextResponse.json({ error: "지원하지 않는 타입입니다." }, { status: 400 });
    }

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    // Look up item by id + user_id ownership
    const existing = await pool.query(
      `SELECT id, share_token${type !== "box" ? ", is_public" : ""} FROM ${mapping.table} WHERE id = $1 AND ${mapping.ownerCol} = $2`,
      [id, user.id]
    );
    if (!existing.rows[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const item = existing.rows[0];
    let shareToken: string = item.share_token;

    // For box items: just ensure a token exists (no is_public toggle)
    if (type === "box") {
      if (!shareToken) {
        shareToken = generateShareToken();
        await pool.query(
          `UPDATE ${mapping.table} SET share_token = $1 WHERE id = $2 AND ${mapping.ownerCol} = $3`,
          [shareToken, id, user.id]
        );
      }
      return NextResponse.json({
        share_url: `${BASE_URL}/share/${type}/${shareToken}`,
        is_public: true,
        share_token: shareToken,
      });
    }

    // For all others: toggle is_public and generate token if needed
    if (is_public && !shareToken) {
      shareToken = generateShareToken();
    }

    const result = await pool.query(
      `UPDATE ${mapping.table} SET is_public = $1, share_token = $2 WHERE id = $3 AND ${mapping.ownerCol} = $4 RETURNING *`,
      [is_public, shareToken ?? item.share_token, id, user.id]
    );

    const updated = result.rows[0];
    return NextResponse.json({
      share_url: updated.share_token ? `${BASE_URL}/share/${type}/${updated.share_token}` : null,
      is_public: updated.is_public,
      share_token: updated.share_token,
    });
  } catch (err) {
    console.error("[share POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
