import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { publishToRoom } from "@/lib/chat";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

const MSG_SELECT = `
  SELECT m.*, u.name AS author_name, u.avatar_url AS author_avatar,
    COALESCE((
      SELECT json_agg(json_build_object('emoji', r.emoji, 'count', r.cnt, 'mine', r.mine))
      FROM (
        SELECT emoji,
          COUNT(*)::int AS cnt,
          BOOL_OR(user_id = $user_id) AS mine
        FROM chat_reactions WHERE message_id = m.id
        GROUP BY emoji
      ) r
    ), '[]') AS reactions,
    COALESCE((
      SELECT json_agg(json_build_object('id', a.id, 'name', a.name, 'mimeType', a.mime_type, 'size', a.size, 'url', a.url))
      FROM chat_attachments a WHERE a.message_id = m.id
    ), '[]') AS attachments
  FROM chat_messages m
  LEFT JOIN users u ON u.id = m.user_id
`;

function formatMsg(row: any, userId: string) {
  return {
    id: Number(row.id),
    roomId: Number(row.room_id),
    userId: row.user_id,
    content: row.deleted_at ? null : row.content,
    type: row.type,
    threadId: row.thread_id ? Number(row.thread_id) : null,
    replyCount: Number(row.reply_count ?? 0),
    editedAt: row.edited_at ? Number(row.edited_at) : null,
    deletedAt: row.deleted_at ? Number(row.deleted_at) : null,
    createdAt: Number(row.created_at),
    author: { id: row.user_id, name: row.author_name, avatar: row.author_avatar ?? null },
    reactions: row.reactions ?? [],
    attachments: row.attachments ?? [],
    isOwn: row.user_id === userId,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const member = await pool.query(
      "SELECT 1 FROM chat_members WHERE room_id=$1 AND user_id=$2",
      [id, user.id]
    );
    if (!member.rows[0]) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before");
    const thread = searchParams.get("thread");
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

    let query: string;
    let queryParams: unknown[];

    const selectWithUser = MSG_SELECT.replace("$user_id", `'${user.id}'`);

    if (thread) {
      query = `${selectWithUser}
        WHERE m.thread_id = $1 AND m.deleted_at IS NULL
        ${before ? "AND m.id < $3" : ""}
        ORDER BY m.created_at ASC LIMIT $2`;
      queryParams = before ? [thread, limit, before] : [thread, limit];
    } else {
      query = `${selectWithUser}
        WHERE m.room_id = $1 AND m.thread_id IS NULL
        ${before ? "AND m.id < $3" : ""}
        ORDER BY m.created_at DESC LIMIT $2`;
      queryParams = before ? [id, limit, before] : [id, limit];
    }

    const r = await pool.query(query, queryParams);
    const messages = r.rows.map(row => formatMsg(row, user.id)).reverse();

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("[chat messages GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const member = await pool.query(
      "SELECT 1 FROM chat_members WHERE room_id=$1 AND user_id=$2",
      [id, user.id]
    );
    if (!member.rows[0]) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

    const body = await request.json();
    const { content, type = "text", threadId, attachments = [] } = body;

    if (!content?.trim() && type === "text" && attachments.length === 0) {
      return NextResponse.json({ error: "내용이 없습니다" }, { status: 400 });
    }

    const now = Date.now();
    const r = await pool.query(
      `INSERT INTO chat_messages (room_id, user_id, content, type, thread_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, user.id, content?.trim() ?? "", type, threadId ?? null, now]
    );
    const msg = r.rows[0];

    // Save attachments
    const savedAttachments: any[] = [];
    for (const att of attachments as any[]) {
      if (!att.name || !att.url) continue;
      const ar = await pool.query(
        `INSERT INTO chat_attachments (message_id, name, mime_type, size, url)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [msg.id, att.name, att.mimeType ?? "application/octet-stream", att.size ?? 0, att.url]
      );
      const a = ar.rows[0];
      savedAttachments.push({ id: Number(a.id), name: a.name, mimeType: a.mime_type, size: a.size, url: a.url });
    }

    if (threadId) {
      await pool.query(
        "UPDATE chat_messages SET reply_count=reply_count+1 WHERE id=$1",
        [threadId]
      );
    }

    await pool.query("UPDATE chat_rooms SET updated_at=$1 WHERE id=$2", [now, id]);

    const userRow = await pool.query("SELECT name, avatar_url FROM users WHERE id=$1", [user.id]);
    const authorName = userRow.rows[0]?.name;
    const authorAvatar = userRow.rows[0]?.avatar_url ?? null;

    const formatted = {
      id: Number(msg.id),
      roomId: Number(msg.room_id),
      userId: msg.user_id,
      content: msg.content,
      type: msg.type,
      threadId: msg.thread_id ? Number(msg.thread_id) : null,
      replyCount: 0,
      editedAt: null,
      deletedAt: null,
      createdAt: Number(msg.created_at),
      author: { id: user.id, name: authorName, avatar: authorAvatar },
      reactions: [],
      attachments: savedAttachments,
      isOwn: true,
    };

    await publishToRoom(pool, Number(id), { type: "message", data: formatted });

    return NextResponse.json({ message: formatted }, { status: 201 });
  } catch (err) {
    console.error("[chat messages POST]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
