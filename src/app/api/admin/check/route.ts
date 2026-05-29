import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/auth";
import { getAdminRole, isMasterAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ isAdmin: false, role: null });
  const role = await getAdminRole(db, session.email);
  return NextResponse.json({
    isAdmin: !!role,
    isMaster: isMasterAdmin(session.email),
    role,
    email: session.email,
  });
}
