/**
 * KRL.KR — Email Receive API
 * Called by Cloudflare Email Worker when email arrives at *@krl.kr
 * Protected by shared WORKER_SECRET
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { generateId } from "@/lib/utils";
import { z } from "zod";

const ReceiveSchema = z.object({
  alias: z.string().min(1).max(64),
  from_address: z.string(),
  to_address: z.string(),
  subject: z.string().optional(),
  body_text: z.string().optional(),
  body_html: z.string().optional(),
  headers: z.record(z.string()).optional(),
  size: z.number().optional(),
  received_at: z.number(),
});

export async function POST(request: NextRequest) {
  // Verify worker secret
  const secret = request.headers.get("X-Worker-Secret");
  const expectedSecret = process.env.WORKER_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = ReceiveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const db = getDB();
    const now = Date.now();

    // Look up user by alias
    const aliasRecord = await db
      .prepare("SELECT user_id FROM email_aliases WHERE alias = ? AND is_active = 1")
      .bind(data.alias.toLowerCase())
      .first<{ user_id: string }>();

    const messageId = generateId("msg");

    // Store the email message
    await db
      .prepare(
        `INSERT INTO email_messages (
          id, alias, user_id, from_address, to_address, subject,
          body_text, body_html, headers, size, is_read, received_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
      )
      .bind(
        messageId,
        data.alias.toLowerCase(),
        aliasRecord?.user_id ?? null,
        data.from_address,
        data.to_address,
        data.subject ?? "(제목 없음)",
        data.body_text ?? "",
        data.body_html ?? "",
        JSON.stringify(data.headers ?? {}),
        data.size ?? 0,
        Number(data.received_at),
        now
      )
      .run();

    return NextResponse.json({
      success: true,
      id: messageId,
      alias: data.alias,
      user_found: !!aliasRecord,
    });
  } catch (err) {
    console.error("[/api/v1/email/receive] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
