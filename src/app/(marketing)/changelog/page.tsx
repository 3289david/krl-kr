import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "변경 이력 | KRL.KR",
  description: "KRL.KR 서비스의 업데이트 및 변경 내역을 확인하세요.",
};

export const revalidate = 60;

interface ChangelogEntry {
  id: number;
  version: string;
  title: string;
  content: string;
  type: string;
  published: boolean;
  created_at: number;
}

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  feature:     { label: "새 기능",   color: "#2563eb", bg: "#EFF6FF" },
  improvement: { label: "개선",     color: "#059669", bg: "#ECFDF5" },
  fix:         { label: "버그 수정", color: "#dc2626", bg: "#FEF2F2" },
  security:    { label: "보안",     color: "#7c3aed", bg: "#F5F3FF" },
  breaking:    { label: "주요 변경", color: "#ea580c", bg: "#FFF7ED" },
};

const DEFAULT_ENTRIES: ChangelogEntry[] = [
  {
    id: 1,
    version: "v1.4.0",
    title: "AI 채팅 & 검색 요약 기능 출시",
    content: `- OpenAI 기반 AI 채팅 기능 추가 (/chat)\n- 검색 결과에 AI 요약 표시\n- 로컬 SearXNG 검색 엔진 통합\n- 관리자 헤더 편집기 출시 (드래그 앤 드롭 지원)`,
    type: "feature",
    published: true,
    created_at: Date.now() - 7 * 24 * 3600 * 1000,
  },
  {
    id: 2,
    version: "v1.3.0",
    title: "A/AAAA/CNAME 서브도메인 지원",
    content: `- 서브도메인에 A, AAAA, CNAME 레코드 타입 추가\n- Cloudflare DNS 직접 연동\n- 서브도메인 삭제 시 DNS 레코드 자동 제거\n- 리버스 프록시 개선 (올바른 Host 헤더 전달)`,
    type: "feature",
    published: true,
    created_at: Date.now() - 14 * 24 * 3600 * 1000,
  },
  {
    id: 3,
    version: "v1.2.5",
    title: "보안 패치 및 성능 개선",
    content: `- Cloudflare 프록시를 통한 실제 클라이언트 IP 추출 (CF-Connecting-IP)\n- nginx 요청 제한 구역 개선\n- 인증 API 분리 (세션 조회 / 쓰기 별도 제한)\n- 관리자 우회 공격 방어 강화`,
    type: "security",
    published: true,
    created_at: Date.now() - 21 * 24 * 3600 * 1000,
  },
  {
    id: 4,
    version: "v1.2.0",
    title: "파일 공유 & 텍스트 붙여넣기 기능",
    content: `- /tools/drop: 파일 업로드 후 링크 공유\n- /tools/paste: 코드 및 텍스트 공유\n- 최대 500MB 파일 업로드 지원\n- 다운로드 횟수 및 만료일 설정 가능`,
    type: "feature",
    published: true,
    created_at: Date.now() - 30 * 24 * 3600 * 1000,
  },
  {
    id: 5,
    version: "v1.1.0",
    title: "서브도메인 관리 기능 출시",
    content: `- 내이름.krl.kr 형태의 서브도메인 생성\n- 정적 사이트 호스팅 (HTML 직접 입력)\n- 외부 URL 리다이렉트 지원\n- Cloudflare DNS 자동 동기화`,
    type: "feature",
    published: true,
    created_at: Date.now() - 45 * 24 * 3600 * 1000,
  },
  {
    id: 6,
    version: "v1.0.0",
    title: "KRL.KR 정식 출시",
    content: `- URL 단축 서비스 (krl.kr/abc)\n- QR 코드 생성 (SVG/PNG 다운로드)\n- Link-in-bio 프로필 페이지 (@닉네임)\n- 다이나믹 링크, 임시 링크, 앱 링크\n- 이메일 수신함 (이름@krl.kr)\n- 웹훅 테스트 도구\n- 개발자 도구 모음 (IP, DNS, UUID, Hash, Base64, JWT)`,
    type: "feature",
    published: true,
    created_at: Date.now() - 60 * 24 * 3600 * 1000,
  },
];

async function fetchEntries(): Promise<ChangelogEntry[]> {
  try {
    const { getPool } = await import("@/lib/db/postgres");
    const pool = getPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS changelog_entries (
        id SERIAL PRIMARY KEY,
        version TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'feature',
        published BOOLEAN NOT NULL DEFAULT true,
        created_by TEXT NOT NULL DEFAULT '',
        created_at BIGINT NOT NULL,
        updated_at BIGINT
      )
    `);

    const result = await pool.query(
      `SELECT * FROM changelog_entries WHERE published = true ORDER BY created_at DESC LIMIT 200`
    );
    if (result.rows.length === 0) return DEFAULT_ENTRIES;
    return result.rows as ChangelogEntry[];
  } catch {
    return DEFAULT_ENTRIES;
  }
}

export default async function ChangelogPage() {
  const entries = await fetchEntries();

  return (
    <main style={{ minHeight: "100vh", background: "var(--color-canvas)" }}>
      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "60px 24px 100px" }}>

        {/* Header */}
        <div style={{ marginBottom: "52px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: "10px" }}>
            변경 이력
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--color-muted)", lineHeight: 1.6 }}>
            KRL.KR의 업데이트 내역입니다. 새 기능 추가, 버그 수정, 성능 개선 등을 기록합니다.
          </p>
        </div>

        {/* Timeline */}
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute", left: "14px", top: "8px", bottom: "8px",
            width: "2px", background: "var(--color-hairline)",
          }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
            {entries.map((entry) => {
              const meta = TYPE_META[entry.type] ?? TYPE_META.feature;
              const date = new Date(Number(entry.created_at));
              const lines = entry.content.split("\n").filter(Boolean);

              return (
                <div key={entry.id} style={{ display: "flex", gap: "28px", paddingLeft: "0" }}>
                  {/* Dot */}
                  <div style={{ flexShrink: 0, paddingTop: "4px" }}>
                    <div style={{
                      width: "30px", height: "30px", borderRadius: "50%",
                      background: "var(--color-canvas)", border: `2px solid ${meta.color}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative", zIndex: 1,
                    }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: meta.color }} />
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingBottom: "0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 700,
                        color: "var(--color-ink)",
                        background: "var(--color-lifted)", border: "1px solid var(--color-hairline-strong)",
                        borderRadius: "6px", padding: "2px 8px",
                      }}>{entry.version}</span>
                      <span style={{
                        fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px",
                        borderRadius: "6px", background: meta.bg, color: meta.color,
                        textTransform: "uppercase", letterSpacing: "0.04em",
                      }}>{meta.label}</span>
                      <span style={{ fontSize: "0.8125rem", color: "var(--color-ash)" }}>
                        {date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
                      </span>
                    </div>

                    <h2 style={{ fontSize: "1.125rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "12px", color: "var(--color-ink)" }}>
                      {entry.title}
                    </h2>

                    <div style={{
                      background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
                      borderRadius: "12px", padding: "16px 20px",
                    }}>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {lines.map((line, i) => {
                          const text = line.startsWith("- ") ? line.slice(2) : line;
                          return (
                            <li key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                              <span style={{ color: meta.color, flexShrink: 0, marginTop: "3px" }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              </span>
                              <span style={{ fontSize: "0.875rem", color: "var(--color-body)", lineHeight: 1.55 }}>{text}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </main>
  );
}
