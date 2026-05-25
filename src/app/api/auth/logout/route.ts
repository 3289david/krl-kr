import { NextResponse } from "next/server";

const COOKIE_NAME = "krl_session";

function clearCookieAndRedirect(destination: string) {
  const response = NextResponse.redirect(new URL(destination, process.env.APP_URL ?? "https://krl.kr"));
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

// POST: called by LogoutButton client component
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

// GET: fallback in case someone navigates directly (e.g., old bookmarks)
export async function GET() {
  return clearCookieAndRedirect("/login");
}
