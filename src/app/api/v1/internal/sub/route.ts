/**
 * KRL.KR — Subdomain Redirect Handler
 * GET /api/v1/internal/sub?name=david
 *
 * Called internally by middleware for *.krl.kr subdomain requests.
 * Looks up the subdomain target in DB and issues a 302 redirect.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/postgres";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");

  if (!name) {
    return NextResponse.redirect(new URL("/", process.env.APP_URL ?? "https://krl.kr"));
  }

  try {
    const row = await db
      .prepare(
        "SELECT target, type FROM subdomains WHERE subdomain = ? AND is_active = 1"
      )
      .bind(name)
      .first<{ target: string; type: string }>();

    if (!row) {
      return NextResponse.redirect(new URL("/", process.env.APP_URL ?? "https://krl.kr"));
    }

    // Ensure target has a protocol
    let target = row.target;
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = `https://${target}`;
    }

    return NextResponse.redirect(target, { status: 302 });
  } catch (err) {
    console.error("[/api/v1/internal/sub] DB error:", err);
    return NextResponse.redirect(new URL("/", process.env.APP_URL ?? "https://krl.kr"));
  }
}
