/**
 * KRL.KR — Database Types and Helpers
 * Now uses PostgreSQL via the PostgresDatabase wrapper.
 * D1Database is aliased to KRLDatabase for backward compatibility.
 */

export type { KRLDatabase as D1Database } from "./postgres";
import type { KRLDatabase } from "./postgres";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  password_hash: string | null;
  plan: "free" | "pro" | "business";
  api_key: string | null;
  avatar_url: string | null;
  verified: number;
  created_at: number;
  updated_at: number;
}

export interface Link {
  id: string;
  slug: string;
  original_url: string;
  user_id: string | null;
  title: string | null;
  description: string | null;
  og_image: string | null;
  password_hash: string | null;
  is_active: number;
  expires_at: number | null;
  max_clicks: number | null;
  click_count: number;
  unique_count: number;
  is_dynamic: number;
  ios_url: string | null;
  android_url: string | null;
  fallback_url: string | null;
  geo_rules: string | null;
  device_rules: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: number;
  updated_at: number;
}

export interface Click {
  id: string;
  link_id: string;
  clicked_at: number;
  country: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  device_type: string | null;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  referer: string | null;
  referer_domain: string | null;
  user_agent: string | null;
  ip_hash: string | null;
}

export interface QrCode {
  id: string;
  link_id: string | null;
  user_id: string | null;
  style: string;
  logo_url: string | null;
  scan_count: number;
  created_at: number;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string;
  last_used_at: number | null;
  expires_at: number | null;
  created_at: number;
}

// ─── DB Helpers ───────────────────────────────────────────────────────────────

export async function getLink(db: KRLDatabase, slug: string): Promise<Link | null> {
  return db
    .prepare("SELECT * FROM links WHERE slug = ? AND is_active = 1 LIMIT 1")
    .bind(slug)
    .first<Link>();
}

export async function getLinkById(db: KRLDatabase, id: string): Promise<Link | null> {
  return db
    .prepare("SELECT * FROM links WHERE id = ? LIMIT 1")
    .bind(id)
    .first<Link>();
}

export async function getLinksByUser(
  db: KRLDatabase,
  userId: string,
  limit = 20,
  offset = 0
): Promise<Link[]> {
  const result = await db
    .prepare(
      "SELECT * FROM links WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    )
    .bind(userId, limit, offset)
    .all<Link>();
  return result.results;
}

export async function countLinksByUser(db: KRLDatabase, userId: string): Promise<number> {
  const result = await db
    .prepare("SELECT COUNT(*) as count FROM links WHERE user_id = ?")
    .bind(userId)
    .first<{ count: number }>();
  return result?.count ?? 0;
}

export async function createLink(
  db: KRLDatabase,
  link: Omit<Link, "click_count" | "unique_count">
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO links (
        id, slug, original_url, user_id, title, description, og_image,
        password_hash, is_active, expires_at, max_clicks, click_count, unique_count,
        is_dynamic, ios_url, android_url, fallback_url, geo_rules, device_rules,
        utm_source, utm_medium, utm_campaign, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, 0, 0,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )`
    )
    .bind(
      link.id, link.slug, link.original_url, link.user_id, link.title,
      link.description, link.og_image, link.password_hash, link.is_active,
      link.expires_at, link.max_clicks, link.is_dynamic, link.ios_url,
      link.android_url, link.fallback_url, link.geo_rules, link.device_rules,
      link.utm_source, link.utm_medium, link.utm_campaign,
      link.created_at, link.updated_at
    )
    .run();
}

export async function updateLink(
  db: KRLDatabase,
  id: string,
  data: Partial<Link>
): Promise<void> {
  const fields = Object.entries(data)
    .filter(([key]) => key !== "id")
    .map(([key]) => `${key} = ?`);
  const values = Object.entries(data)
    .filter(([key]) => key !== "id")
    .map(([, v]) => v);

  if (fields.length === 0) return;

  await db
    .prepare(`UPDATE links SET ${fields.join(", ")}, updated_at = ? WHERE id = ?`)
    .bind(...values, Date.now(), id)
    .run();
}

export async function deleteLink(db: KRLDatabase, id: string, userId: string): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM links WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .run();
  return (result.meta as { changes?: number })?.changes === 1;
}

export async function incrementClickCount(
  db: KRLDatabase,
  linkId: string,
  isUnique: boolean
): Promise<void> {
  if (isUnique) {
    await db
      .prepare(
        "UPDATE links SET click_count = click_count + 1, unique_count = unique_count + 1 WHERE id = ?"
      )
      .bind(linkId)
      .run();
  } else {
    await db
      .prepare("UPDATE links SET click_count = click_count + 1 WHERE id = ?")
      .bind(linkId)
      .run();
  }
}

export async function recordClick(db: KRLDatabase, click: Click): Promise<void> {
  await db
    .prepare(
      `INSERT INTO clicks (
        id, link_id, clicked_at, country, city, region, latitude, longitude,
        device_type, browser, browser_version, os, os_version,
        referer, referer_domain, user_agent, ip_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      click.id, click.link_id, click.clicked_at,
      click.country, click.city, click.region, click.latitude, click.longitude,
      click.device_type, click.browser, click.browser_version,
      click.os, click.os_version,
      click.referer, click.referer_domain,
      click.user_agent, click.ip_hash
    )
    .run();
}

export async function getUser(db: KRLDatabase, email: string): Promise<User | null> {
  return db
    .prepare("SELECT * FROM users WHERE email = ? LIMIT 1")
    .bind(email)
    .first<User>();
}

export async function getUserById(db: KRLDatabase, id: string): Promise<User | null> {
  return db
    .prepare("SELECT * FROM users WHERE id = ? LIMIT 1")
    .bind(id)
    .first<User>();
}

export async function createUser(db: KRLDatabase, user: User): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (id, email, name, password_hash, plan, api_key, avatar_url, verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      user.id, user.email, user.name, user.password_hash, user.plan,
      user.api_key, user.avatar_url, user.verified, user.created_at, user.updated_at
    )
    .run();
}

export async function getClickAnalytics(
  db: KRLDatabase,
  linkId: string,
  days = 30
): Promise<{
  total: number;
  byDay: Array<{ date: string; count: number }>;
  byCountry: Array<{ country: string; count: number }>;
  byDevice: Array<{ device_type: string; count: number }>;
  byBrowser: Array<{ browser: string; count: number }>;
  byReferer: Array<{ referer_domain: string; count: number }>;
}> {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  const [totalResult, byDayResult, byCountryResult, byDeviceResult, byBrowserResult, byRefererResult] =
    await Promise.all([
      db
        .prepare("SELECT COUNT(*) as count FROM clicks WHERE link_id = ? AND clicked_at >= ?")
        .bind(linkId, since)
        .first<{ count: number }>(),
      db
        .prepare(
          `SELECT date(clicked_at / 1000, 'unixepoch') as date, COUNT(*) as count
           FROM clicks WHERE link_id = ? AND clicked_at >= ?
           GROUP BY date ORDER BY date DESC LIMIT ?`
        )
        .bind(linkId, since, days)
        .all<{ date: string; count: number }>(),
      db
        .prepare(
          `SELECT country, COUNT(*) as count FROM clicks
           WHERE link_id = ? AND clicked_at >= ? AND country IS NOT NULL
           GROUP BY country ORDER BY count DESC LIMIT 10`
        )
        .bind(linkId, since)
        .all<{ country: string; count: number }>(),
      db
        .prepare(
          `SELECT device_type, COUNT(*) as count FROM clicks
           WHERE link_id = ? AND clicked_at >= ?
           GROUP BY device_type ORDER BY count DESC`
        )
        .bind(linkId, since)
        .all<{ device_type: string; count: number }>(),
      db
        .prepare(
          `SELECT browser, COUNT(*) as count FROM clicks
           WHERE link_id = ? AND clicked_at >= ? AND browser IS NOT NULL
           GROUP BY browser ORDER BY count DESC LIMIT 5`
        )
        .bind(linkId, since)
        .all<{ browser: string; count: number }>(),
      db
        .prepare(
          `SELECT referer_domain, COUNT(*) as count FROM clicks
           WHERE link_id = ? AND clicked_at >= ? AND referer_domain IS NOT NULL
           GROUP BY referer_domain ORDER BY count DESC LIMIT 5`
        )
        .bind(linkId, since)
        .all<{ referer_domain: string; count: number }>(),
    ]);

  return {
    total: totalResult?.count ?? 0,
    byDay: byDayResult.results,
    byCountry: byCountryResult.results,
    byDevice: byDeviceResult.results,
    byBrowser: byBrowserResult.results,
    byReferer: byRefererResult.results,
  };
}
