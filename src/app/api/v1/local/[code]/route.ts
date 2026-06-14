import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";

type Ctx = { params: Promise<{ code: string }> };

function getClientIp(request: NextRequest): string {
  const xReal = request.headers.get("x-real-ip");
  if (xReal) return xReal.split(",")[0].trim();
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return "unknown";
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const { code } = await params;
  const db = getDB(request);

  const space = await db.prepare("SELECT * FROM local_spaces WHERE code = ? AND is_active = 1").bind(code.toUpperCase()).first() as Record<string, unknown> | null;
  if (!space) return NextResponse.json({ error: "공간을 찾을 수 없습니다." }, { status: 404 });

  const clientIp = getClientIp(request);
  const spaceIp = space.creator_ip as string | null;
  if (spaceIp && spaceIp !== "unknown" && clientIp !== "unknown" && clientIp !== spaceIp) {
    return NextResponse.json({ error: "같은 Wi-Fi에서만 접근할 수 있습니다.", wifi_mismatch: true }, { status: 403 });
  }

  return NextResponse.json({ space: { id: space.id, name: space.name, description: space.description, code: space.code, ssid_hint: space.ssid_hint } });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { code } = await params;
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const space = await db.prepare("SELECT * FROM local_spaces WHERE code = ? AND user_id = ?").bind(code.toUpperCase(), auth.user.id).first() as Record<string, unknown> | null;
  if (!space) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  await db.prepare("DELETE FROM local_messages WHERE space_id = ?").bind(space.id).run();
  await db.prepare("DELETE FROM local_spaces WHERE id = ?").bind(space.id).run();
  return NextResponse.json({ ok: true });
}
