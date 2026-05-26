/**
 * KRL.KR — Shared API error handling utilities
 */
import { NextResponse } from "next/server";

export function isDBError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("DATABASE_URL") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("connect ETIMEDOUT") ||
    msg.includes("Connection terminated") ||
    msg.includes("connection timeout") ||
    msg.includes("SSL") ||
    msg.includes("ENOTFOUND")
  );
}

export function dbUnavailable() {
  return NextResponse.json(
    { error: "데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.", code: "DB_UNAVAILABLE" },
    { status: 503 }
  );
}

export function handleAPIError(err: unknown, context?: string): NextResponse {
  console.error(`[API${context ? " " + context : ""}] Error:`, err);
  if (isDBError(err)) return dbUnavailable();
  return NextResponse.json(
    { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
