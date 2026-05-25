import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId, generateApiKey } from "@/lib/utils";
import { z } from "zod";

const AVAILABLE_SCOPES = [
  "links:read",
  "links:write",
  "analytics:read",
  "files:read",
  "files:write",
  "paste:read",
  "paste:write",
  "qr:generate",
  "bio:read",
  "bio:write",
  "webhook:read",
  "webhook:write",
];

const CreateKeySchema = z.object({
  name: z.string().min(1, "키 이름을 입력해주세요.").max(100),
  scopes: z
    .array(z.string())
    .min(1, "최소 하나의 권한을 선택해주세요.")
    .refine(
      (scopes) => scopes.every((s) => AVAILABLE_SCOPES.includes(s)),
      "유효하지 않은 권한이 포함되어 있습니다."
    ),
  expires_at: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const result = await db
      .prepare(
        `SELECT id, name, key_prefix, scopes, last_used_at, expires_at, created_at
         FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`
      )
      .bind(user.id)
      .all<Record<string, unknown>>();

    return NextResponse.json({
      keys: result.results.map((k) => ({
        ...k,
        scopes: (() => { try { return JSON.parse(k.scopes as string); } catch { return []; } })(),
      })),
      available_scopes: AVAILABLE_SCOPES,
    });
  } catch (err) {
    console.error("[/api/v1/keys GET] Error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB(request);
    if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    // Check key limit
    const countResult = await db
      .prepare("SELECT COUNT(*) as count FROM api_keys WHERE user_id = ?")
      .bind(user.id)
      .first<{ count: number }>();
    const count = countResult?.count ?? 0;

    if (count >= 10) {
      return NextResponse.json(
        { error: "API 키는 최대 10개까지 생성할 수 있습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = CreateKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const data = parsed.data;
    const apiKey = generateApiKey();

    // Hash the key
    const encoder = new TextEncoder();
    const keyBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(apiKey));
    const keyHash = Array.from(new Uint8Array(keyBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    let expiresAt: number | null = null;
    if (data.expires_at) {
      expiresAt = new Date(data.expires_at).getTime();
      if (isNaN(expiresAt)) {
        return NextResponse.json({ error: "잘못된 만료 날짜 형식입니다." }, { status: 400 });
      }
    }

    const keyId = generateId("key");
    const now = Date.now();

    await db
      .prepare(
        `INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, scopes, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        keyId,
        user.id,
        data.name,
        keyHash,
        apiKey.substring(0, 12),
        JSON.stringify(data.scopes),
        expiresAt,
        now
      )
      .run();

    return NextResponse.json(
      {
        id: keyId,
        name: data.name,
        key: apiKey, // Shown ONCE
        key_prefix: apiKey.substring(0, 12),
        scopes: data.scopes,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        created_at: new Date(now).toISOString(),
        warning: "이 API 키는 지금 한 번만 표시됩니다. 안전한 곳에 보관하세요.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[/api/v1/keys POST] Error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
