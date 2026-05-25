import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId } from "@/lib/utils";

interface WebhookEndpoint {
  id: string;
  user_id: string | null;
  slug: string;
  label: string | null;
  expires_at: number | null;
  request_count: number;
  created_at: number;
}

async function handleWebhookRequest(
  request: NextRequest,
  params: Promise<{ slug: string }>,
  method: string
) {
  const { slug } = await params;
  const db = getDB(request);
  if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const isInspect = searchParams.get("inspect") === "1";

  const endpoint = await db
    .prepare("SELECT * FROM webhook_endpoints WHERE slug = ? LIMIT 1")
    .bind(slug)
    .first<WebhookEndpoint>();

  if (!endpoint) {
    return NextResponse.json({ error: "웹훅 엔드포인트를 찾을 수 없습니다." }, { status: 404 });
  }

  // Check expiry
  if (endpoint.expires_at && Date.now() > endpoint.expires_at) {
    return NextResponse.json({ error: "만료된 웹훅 엔드포인트입니다." }, { status: 410 });
  }

  // Inspect mode: return recorded requests
  if (isInspect) {
    const requests = await db
      .prepare(
        `SELECT id, method, headers, body, query, ip, received_at
         FROM webhook_inspections WHERE endpoint_id = ?
         ORDER BY received_at DESC LIMIT 100`
      )
      .bind(endpoint.id)
      .all<Record<string, unknown>>();

    return NextResponse.json({
      endpoint: {
        id: endpoint.id,
        slug: endpoint.slug,
        label: endpoint.label,
        url: `https://krl.kr/w/${slug}`,
        expires_at: endpoint.expires_at ? new Date(endpoint.expires_at).toISOString() : null,
        request_count: endpoint.request_count,
        created_at: new Date(endpoint.created_at).toISOString(),
      },
      requests: requests.results.map((r) => ({
        ...r,
        headers: (() => { try { return JSON.parse(r.headers as string); } catch { return {}; } })(),
        received_at: new Date(r.received_at as number).toISOString(),
      })),
    });
  }

  // Record the incoming request
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    // Skip sensitive headers
    if (!["cookie", "authorization", "x-api-key"].includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });

  let bodyText: string | null = null;
  try {
    bodyText = await request.text();
    if (bodyText.length > 100_000) {
      bodyText = bodyText.substring(0, 100_000) + "... [truncated]";
    }
  } catch {
    bodyText = null;
  }

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for") ??
    null;

  const queryString = searchParams.toString();

  const inspectionId = generateId("whi");
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO webhook_inspections (id, endpoint_id, method, headers, body, query, ip, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      inspectionId,
      endpoint.id,
      method,
      JSON.stringify(headers),
      bodyText,
      queryString || null,
      ip,
      now
    )
    .run();

  // Update request count
  await db
    .prepare("UPDATE webhook_endpoints SET request_count = request_count + 1 WHERE id = ?")
    .bind(endpoint.id)
    .run();

  return NextResponse.json(
    {
      received: true,
      id: inspectionId,
      timestamp: new Date(now).toISOString(),
    },
    { status: 200 }
  );
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return handleWebhookRequest(request, params, "GET");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return handleWebhookRequest(request, params, "POST");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return handleWebhookRequest(request, params, "PUT");
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return handleWebhookRequest(request, params, "PATCH");
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);

  // If it's a management delete (with auth), delete the endpoint
  const isManage = searchParams.get("manage") === "1";
  if (isManage) {
    const db = getDB(request);
    if (!db) return NextResponse.json({ error: "서비스를 이용할 수 없습니다." }, { status: 503 });

    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const result = await db
      .prepare("DELETE FROM webhook_endpoints WHERE slug = ? AND user_id = ?")
      .bind(slug, user.id)
      .run();

    const changes = (result.meta as { changes?: number })?.changes ?? 0;
    if (changes === 0) {
      return NextResponse.json({ error: "엔드포인트를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  }

  return handleWebhookRequest(request, params, "DELETE");
}
