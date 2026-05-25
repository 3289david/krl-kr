/**
 * KRL.KR — Database & Environment Helpers
 * VPS mode: uses PostgreSQL (not Cloudflare D1)
 */
import type { NextRequest } from "next/server";
import { db, type KRLDatabase } from "./db/postgres";

/**
 * Gets the database instance.
 * On VPS, this is always the PostgreSQL pool singleton.
 * The request parameter is kept for API compatibility but unused.
 */
export function getDB(_request?: NextRequest): KRLDatabase {
  return db;
}

/**
 * Gets the upload directory for file storage.
 */
export function getUploadDir(): string {
  return process.env.UPLOAD_DIR ?? "/tmp/krl-uploads";
}

/**
 * Gets the base URL of the application.
 */
export function getAppUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

/**
 * Gets the domain for short URLs.
 */
export function getShortDomain(): string {
  return process.env.SHORT_DOMAIN ?? "krl.kr";
}
