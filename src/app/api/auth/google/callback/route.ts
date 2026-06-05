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

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) throw new Error("No access token");

    // Get user profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();

    const email = profile.email as string;
    const name = (profile.name ?? profile.given_name ?? "") as string;
    const avatar = (profile.picture ?? "") as string;
    const oauthId = profile.sub as string;

    await ensureOAuthColumns();
    const db = getDB(request);

    // Find existing user by email (handles account linking)
    let user = await db
      .prepare("SELECT id, email, name, plan FROM users WHERE email = ? LIMIT 1")
      .bind(email.toLowerCase())
      .first<{ id: string; email: string; name: string; plan: string }>();

    if (!user) {
      // Create new user
      const userId = generateId("usr");
      const now = Date.now();
      await db
        .prepare(
          `INSERT INTO users (id, email, name, password_hash, plan, api_key, avatar_url, verified, oauth_provider, oauth_id, created_at, updated_at)
           VALUES (?, ?, ?, NULL, 'free', NULL, ?, 1, 'google', ?, ?, ?)`
        )
        .bind(userId, email.toLowerCase(), name, avatar, oauthId, now, now)
        .run();
      user = { id: userId, email: email.toLowerCase(), name, plan: "free" };
    } else {
      // Update OAuth info and avatar
      await db
        .prepare("UPDATE users SET oauth_provider = 'google', oauth_id = ?, avatar_url = ?, updated_at = ? WHERE id = ?")
        .bind(oauthId, avatar, Date.now(), user.id)
        .run();
    }

    // Get plan from user_plans if exists
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
    console.error("[google callback]", err);
    return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`);
  }
}
