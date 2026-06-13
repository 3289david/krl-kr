import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/env";
import { requireAuth } from "@/lib/auth";
import { generateId } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const db = getDB(request);
  const type = request.nextUrl.searchParams.get("type") ?? "";
  const category = request.nextUrl.searchParams.get("category") ?? "";
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const mine = request.nextUrl.searchParams.get("mine") === "1";
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1"));
  const limit = 30;
  const offset = (page - 1) * limit;

  if (mine) {
    const auth = await requireAuth(db, request);
    if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    const rows = await db.prepare("SELECT * FROM match_listings WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?").bind(auth.user.id, limit, offset).all();
    return NextResponse.json({ listings: rows.results ?? [] });
  }

  let sql = "SELECT * FROM match_listings WHERE status = 'active'";
  const binds: unknown[] = [];
  if (type) { sql += " AND type = ?"; binds.push(type); }
  if (category) { sql += " AND category = ?"; binds.push(category); }
  if (q) { sql += " AND (title ILIKE ? OR description ILIKE ?)"; binds.push(`%${q}%`, `%${q}%`); }
  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  binds.push(limit, offset);

  const rows = await db.prepare(sql).bind(...binds).all();
  return NextResponse.json({ listings: rows.results ?? [], page, limit });
}

export async function POST(request: NextRequest) {
  const db = getDB(request);
  const auth = await requireAuth(db, request);
  if (auth.error || !auth.user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const { type, title, description, category, contact } = body;

  if (!["have", "need"].includes(type)) return NextResponse.json({ error: "type은 have 또는 need여야 합니다." }, { status: 400 });
  if (!title?.trim()) return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
  if (!category?.trim()) return NextResponse.json({ error: "카테고리를 선택해주세요." }, { status: 400 });

  const id = generateId("mtc");
  const now = Date.now();

  await db.prepare(
    `INSERT INTO match_listings (id, user_id, username, type, title, description, category, contact, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
  ).bind(id, auth.user.id, auth.user.username ?? null, type, title.trim(), description ?? null, category.trim(), contact ?? null, now, now).run();

  return NextResponse.json({ listing: { id, type, title: title.trim(), description, category: category.trim(), contact, status: "active" } }, { status: 201 });
}
