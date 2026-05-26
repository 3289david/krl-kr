import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { handleAPIError } from "@/lib/api-error";

function mapLink(l: Record<string, unknown>) {
  return {
    ...l,
    created_at: Number(l.created_at),
    updated_at: l.updated_at != null ? Number(l.updated_at) : null,
    expires_at: l.expires_at != null ? Number(l.expires_at) : null,
    click_count: Number(l.click_count ?? 0),
    unique_count: Number(l.unique_count ?? 0),
    max_clicks: l.max_clicks != null ? Number(l.max_clicks) : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const offset = (page - 1) * limit;
    const search = searchParams.get("q") ?? "";
    const isDynamic = searchParams.get("is_dynamic");
    const hasExpiry = searchParams.get("has_expiry");
    const hasApp = searchParams.get("has_app");

    // Build WHERE clause
    const conditions: string[] = ["user_id = ?"];
    const bindings: unknown[] = [user.id];

    if (search) {
      const pattern = `%${search}%`;
      conditions.push("(slug LIKE ? OR original_url LIKE ? OR title LIKE ?)");
      bindings.push(pattern, pattern, pattern);
    }

    if (isDynamic === "1") {
      conditions.push("is_dynamic = 1");
    }

    if (hasExpiry === "1") {
      conditions.push("(expires_at IS NOT NULL OR max_clicks IS NOT NULL)");
    }

    if (hasApp === "1") {
      conditions.push("(ios_url IS NOT NULL OR android_url IS NOT NULL)");
    }

    const where = conditions.join(" AND ");

    const result = await db
      .prepare(
        `SELECT * FROM links WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(...bindings, limit, offset)
      .all<Record<string, unknown>>();

    const countResult = await db
      .prepare(`SELECT COUNT(*) as count FROM links WHERE ${where}`)
      .bind(...bindings)
      .first<{ count: number }>();

    const total = Number(countResult?.count ?? 0);

    return NextResponse.json({
      links: result.results.map(mapLink),
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    });
  } catch (err) {
    return handleAPIError(err, "GET /api/v1/links");
  }
}
