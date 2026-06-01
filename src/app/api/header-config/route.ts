import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_HEADER_CONFIG = {
  logo: { text: "KRL.KR", href: "/" },
  navMenus: [
    {
      id: "links-qr", label: "링크 · QR", visible: true,
      items: [
        { id: "url-shortener", href: "/", label: "URL 단축기", desc: "krl.kr/abc 형태의 짧은 주소", icon: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", icon2: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71", visible: true },
        { id: "qr-code", href: "/qr", label: "QR 코드", desc: "SVG·PNG 다운로드, 로고 삽입", icon: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h4 M18 14v4 M14 18h4 M18 18v4", visible: true },
        { id: "dynamic-link", href: "/dashboard/links?tab=dynamic", label: "다이나믹 링크", desc: "QR 유지하면서 목적지 변경", icon: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4", visible: true },
        { id: "temp-link", href: "/dashboard/links?tab=temp", label: "임시 링크", desc: "시간·클릭 후 자동 만료", icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2", visible: true },
        { id: "app-link", href: "/dashboard/links?tab=app", label: "앱 링크", desc: "iOS/Android별 주소 분기", icon: "M12 18h.01 M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z", visible: true },
      ],
    },
    {
      id: "files-share", label: "파일 · 공유", visible: true,
      items: [
        { id: "file-share", href: "/tools/drop", label: "파일 공유", desc: "업로드 후 링크로 공유", icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12", visible: true },
        { id: "paste", href: "/tools/paste", label: "코드·텍스트 공유", desc: "붙여넣고 링크로 공유", icon: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z", visible: true },
        { id: "email", href: "/dashboard/email", label: "이메일 수신함", desc: "이름@krl.kr로 메일 수신", icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6", visible: true },
        { id: "webhook", href: "/tools/webhook", label: "웹훅 테스트", desc: "요청 실시간 확인", icon: "M18 16.98h-5.99c-1.1 0-1.95.68-2.23 1.61A3 3 0 0 1 2 17c0-1.66 1.34-3 3-3h.5 M12 3C9.24 3 7 5.24 7 8c0 2.16 1.28 3.99 3.12 4.82 M17 8c0-2.76-2.24-5-5-5 M22 8c0 2.76-2.24 5-5 5h-1", visible: true },
      ],
    },
    {
      id: "website", label: "웹사이트", visible: true,
      items: [
        { id: "subdomain", href: "/dashboard/subdomains", label: "서브도메인", desc: "내이름.krl.kr 주소 만들기", icon: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z", visible: true },
        { id: "bio", href: "/tools/bio", label: "Link-in-bio", desc: "krl.kr/@닉네임 프로필 페이지", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", visible: true },
      ],
    },
    {
      id: "dev-tools", label: "개발 도구", visible: true,
      items: [
        { id: "ip-lookup", href: "/tools/dev", label: "IP 조회", desc: "IP 주소와 지역 정보 확인", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z", visible: true },
        { id: "uuid", href: "/tools/dev", label: "UUID 생성기", desc: "랜덤 UUID v4 생성", icon: "M7 7h10v10H7z M12 3v4 M12 17v4 M3 12h4 M17 12h4", visible: true },
        { id: "hash", href: "/tools/dev", label: "Hash 계산기", desc: "SHA-256/512 해시값 계산", icon: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18", visible: true },
        { id: "base64", href: "/tools/dev", label: "Base64", desc: "Base64 인코딩/디코딩", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6", visible: true },
        { id: "dns", href: "/tools/dev", label: "DNS 조회", desc: "A/CNAME/MX/TXT 레코드 확인", icon: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8 M3 3v5h5 M12 7v5l3 3", visible: true },
        { id: "jwt", href: "/tools/dev", label: "JWT 디코드", desc: "JWT 토큰 파싱 및 확인", icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z", visible: true },
      ],
    },
  ],
  simpleLinks: [
    { id: "community", href: "/community", label: "커뮤니티", visible: true },
    { id: "ai-chat", href: "/chat", label: "AI 채팅", icon: "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z M5 14v7M19 14v7M9 14v7M15 14v7", visible: true },
  ],
  rightButtons: {
    search: { visible: true, href: "/search" },
    report: { visible: true },
    donate: { visible: true, href: "/support", label: "후원" },
  },
};

async function ensureTable() {
  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS header_config (
      id INTEGER PRIMARY KEY,
      config_json TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `);
  return pool;
}

export async function GET() {
  try {
    const pool = await ensureTable();
    const result = await pool.query("SELECT config_json FROM header_config WHERE id = 1");
    if (!result.rows[0]) {
      return NextResponse.json({ config: DEFAULT_HEADER_CONFIG }, {
        headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
      });
    }
    return NextResponse.json(
      { config: JSON.parse(result.rows[0].config_json) },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }
    );
  } catch {
    return NextResponse.json({ config: DEFAULT_HEADER_CONFIG });
  }
}
