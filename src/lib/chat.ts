import { getRedis } from "./redis";
import Redis from "ioredis";

export async function publishToRoom(pool: any, roomId: number, event: object) {
  try {
    const members = await pool.query(
      "SELECT user_id FROM chat_members WHERE room_id=$1",
      [roomId]
    );
    const redis = getRedis();
    const payload = JSON.stringify(event);
    const pipeline = redis.pipeline();
    for (const m of members.rows) {
      pipeline.publish(`chat:${m.user_id}`, payload);
    }
    await pipeline.exec();
  } catch {}
}

export function makeSubRedis() {
  return new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: false,
  });
}

export function msgWithAuthor(row: any) {
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
    author: row.author_name
      ? { id: row.user_id, name: row.author_name, avatar: row.author_avatar ?? null }
      : null,
    reactions: row.reactions ?? [],
    attachments: row.attachments ?? [],
  };
}
