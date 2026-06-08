import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDB } from "@/lib/env";

export const runtime = "nodejs";

async function getPool() {
  const { getPool: gp } = await import("@/lib/db/postgres");
  return gp();
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const pool = await getPool();
    const r = await pool.query(
      "SELECT id, name, username, discriminator, email, avatar_url, plan, created_at FROM users WHERE id=$1",
      [user.id]
    );
    const u = r.rows[0];
    if (!u) return NextResponse.json({ error: "없음" }, { status: 404 });

    return NextResponse.json({
      id: u.id,
      name: u.name,
      username: u.username,
      discriminator: u.discriminator,
      email: u.email,
      avatar: u.avatar_url,
      plan: u.plan,
      createdAt: Number(u.created_at),
    });
  } catch (err) {
    console.error("[profile GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const db = getDB(request);
    const { user, error } = await requireAuth(db, request);
    if (error) return error;

    const { username, name, discriminator } = await request.json();
    const pool = await getPool();

    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (username !== undefined) {
      const uname = username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,32}$/.test(uname)) {
        return NextResponse.json({ error: "사용자명은 3-32자, 영문 소문자·숫자·_ 만 가능합니다" }, { status: 400 });
      }
      const exists = await pool.query(
        "SELECT id FROM users WHERE username=$1 AND id!=$2",
        [uname, user.id]
      );
      if (exists.rows[0]) return NextResponse.json({ error: "이미 사용중인 사용자명입니다" }, { status: 409 });
      sets.push(`username=$${idx++}`);
      vals.push(uname);
    }

    if (name !== undefined) {
      if (!name.trim()) return NextResponse.json({ error: "이름이 필요합니다" }, { status: 400 });
      sets.push(`name=$${idx++}`);
      vals.push(name.trim());
    }

    if (discriminator !== undefined) {
      if (!discriminator) {
        sets.push(`discriminator=$${idx++}`);
        vals.push(null);
      } else {
        const d = String(discriminator).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
        if (d.length !== 4) return NextResponse.json({ error: "태그는 4자리 영숫자여야 합니다" }, { status: 400 });
        sets.push(`discriminator=$${idx++}`);
        vals.push(d);
      }
    }

    if (sets.length === 0) return NextResponse.json({ ok: true });

    sets.push(`updated_at=$${idx++}`);
    vals.push(Date.now());
    vals.push(user.id);

    await pool.query(`UPDATE users SET ${sets.join(",")} WHERE id=$${idx}`, vals);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.code === "23505") {
      if (err.constraint?.includes("name_disc")) return NextResponse.json({ error: "이미 사용 중인 username#태그 조합입니다" }, { status: 409 });
      return NextResponse.json({ error: "이미 사용 중인 정보입니다" }, { status: 409 });
    }
    console.error("[profile PATCH]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
