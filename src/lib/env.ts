/**
 * KRL.KR — Environment / Binding helpers
 * Extracts Cloudflare D1 binding from Next.js request context or globalThis
 */
import type { NextRequest } from "next/server";
import type { D1Database } from "./db";

interface CloudflareEnv {
  DB?: D1Database;
  URL_CACHE?: unknown;
  STORAGE?: unknown;
}

interface CloudflareRequest {
  cloudflare?: {
    env?: CloudflareEnv;
  };
}

/**
 * Gets the D1 database binding.
 * Works both in Cloudflare Pages (env binding) and local dev (globalThis fallback).
 */
export function getDB(request?: NextRequest): D1Database | null {
  // Cloudflare Pages: env is attached to the request
  if (request) {
    const cfReq = request as unknown as CloudflareRequest;
    if (cfReq.cloudflare?.env?.DB) {
      return cfReq.cloudflare.env.DB;
    }
  }
  // globalThis fallback (wrangler dev / CF Workers)
  const global = globalThis as unknown as { DB?: D1Database };
  return global.DB ?? null;
}
