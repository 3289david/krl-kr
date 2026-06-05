import { NextRequest, NextResponse } from "next/server";
import { createToken, getSessionCookieOptions } from "@/lib/auth";
import { getDB } from "@/lib/env";
import { generateId } from "@/lib/utils";

export const runtime = "nodejs";

async function ensureOAuthColumns() {
  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id TEXT`);
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL ?? "https://krl.kr";
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(error)}`);
  }

  const storedState = request.cookies.get("oauth_state")?.value;
  const redirectTo = request.cookies.get("oauth_redirect")?.value ?? "/dashboard";

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_state`);
  }

  const clientId = process.env.GITHUB_CLIENT_ID!;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET!;

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) throw new Error("No access token");

    // Get user profile
    const profileRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokens.access_token}`, "User-Agent": "krl.kr" },
    });
    const profile = await profileRes.json();

    // Get primary email (may not be public)
    let email = profile.email as string | null;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${tokens.access_token}`, "User-Agent": "krl.kr" },
      });
      const emails = await emailsRes.json();
      const primary = Array.isArray(emails) ? emails.find((e: { primary: boolean; verified: boolean; email: string }) => e.primary && e.verified) : null;
      email = primary?.email ?? null;
    }

    if (!email) {
      return NextResponse.redirect(`${appUrl}/login?error=no_email`);
    }

    const name = (profile.name ?? profile.login ?? "") as string;
    const avatar = (profile.avatar_url ?? "") as string;
    const oauthId = String(profile.id);

    await ensureOAuthColumns();
    const db = getDB(request);

    let user = await db
      .prepare("SELECT id, email, name, plan FROM users WHERE email = ? LIMIT 1")
      .bind(email.toLowerCase())
      .first<{ id: string; email: string; name: string; plan: string }>();

    if (!user) {
      const userId = generateId("usr");
      const now = Date.now();
      await db
        .prepare(
          `INSERT INTO users (id, email, name, password_hash, plan, api_key, avatar_url, verified, oauth_provider, oauth_id, created_at, updated_at)
           VALUES (?, ?, ?, NULL, 'free', NULL, ?, 1, 'github', ?, ?, ?)`
        )
        .bind(userId, email.toLowerCase(), name, avatar, oauthId, now, now)
        .run();
      user = { id: userId, email: email.toLowerCase(), name, plan: "free" };
    } else {
      await db
        .prepare("UPDATE users SET oauth_provider = 'github', oauth_id = ?, avatar_url = ?, updated_at = ? WHERE id = ?")
        .bind(oauthId, avatar, Date.now(), user.id)
        .run();
    }

    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();
    const planRow = await pool.query("SELECT plan FROM user_plans WHERE user_id = $1", [user.id]);
    const plan = planRow.rows[0]?.plan ?? user.plan ?? "free";

    const token = await createToken({ userId: user.id, email: user.email, plan });
    const cookieOptions = getSessionCookieOptions();

    const response = NextResponse.redirect(`${appUrl}${redirectTo}`);
    response.cookies.delete("oauth_state");
    response.cookies.delete("oauth_redirect");
    response.cookies.set({
      name: cookieOptions.name,
      value: token,
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      maxAge: cookieOptions.maxAge,
      path: cookieOptions.path,
    });
    return response;
  } catch (err) {
    console.error("[github callback]", err);
    return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`);
  }
}
