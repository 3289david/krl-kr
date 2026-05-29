/**
 * KRL.KR — Admin utilities
 * Master admin is hardcoded and cannot be removed.
 */
import type { KRLDatabase } from "./db/postgres";
import type { SessionPayload } from "./auth";

// ─── Hardcoded master admin ───────────────────────────────────────────────────
export const MASTER_ADMIN_EMAIL = "davideom0414@gmail.com";

export function isMasterAdmin(email: string): boolean {
  return email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
}

// ─── Check if user is any admin (master or appointed) ─────────────────────────
export async function isAdmin(db: KRLDatabase, email: string): Promise<boolean> {
  if (isMasterAdmin(email)) return true;
  const row = await db
    .prepare("SELECT id FROM admins WHERE email = ? LIMIT 1")
    .bind(email.toLowerCase())
    .first();
  return !!row;
}

export async function getAdminRole(
  db: KRLDatabase,
  email: string
): Promise<"master" | "admin" | null> {
  if (isMasterAdmin(email)) return "master";
  const row = await db
    .prepare("SELECT role FROM admins WHERE email = ? LIMIT 1")
    .bind(email.toLowerCase())
    .first<{ role: string }>();
  if (!row) return null;
  return row.role as "master" | "admin";
}

// ─── Require admin — returns error response if not admin ──────────────────────
export async function requireAdmin(
  db: KRLDatabase,
  session: SessionPayload | null
): Promise<
  | { ok: true; role: "master" | "admin"; email: string }
  | { ok: false; response: Response }
> {
  if (!session) {
    return {
      ok: false,
      response: Response.json({ error: "인증이 필요합니다." }, { status: 401 }),
    };
  }
  const role = await getAdminRole(db, session.email);
  if (!role) {
    return {
      ok: false,
      response: Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 }),
    };
  }
  return { ok: true, role, email: session.email };
}

export async function requireMaster(
  session: SessionPayload | null
): Promise<
  | { ok: true; email: string }
  | { ok: false; response: Response }
> {
  if (!session || !isMasterAdmin(session.email)) {
    return {
      ok: false,
      response: Response.json({ error: "마스터 관리자 권한이 필요합니다." }, { status: 403 }),
    };
  }
  return { ok: true, email: session.email };
}

// ─── Check if user is blocked ─────────────────────────────────────────────────
export async function isUserBlocked(db: KRLDatabase, userId: string): Promise<boolean> {
  const row = await db
    .prepare(
      "SELECT id FROM user_blocks WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?) LIMIT 1"
    )
    .bind(userId, Date.now())
    .first();
  return !!row;
}

export async function isCommunityBanned(db: KRLDatabase, userId: string): Promise<boolean> {
  const row = await db
    .prepare(
      "SELECT id FROM community_bans WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?) LIMIT 1"
    )
    .bind(userId, Date.now())
    .first();
  return !!row;
}
