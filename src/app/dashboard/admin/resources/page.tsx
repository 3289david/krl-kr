"use client";
import { useState, useCallback } from "react";
import Link from "next/link";

interface LinkRow { id: string; slug: string; original_url: string; title: string | null; click_count: number; is_active: number; created_at: number; user_id: string; user_email: string; user_name: string | null; }
interface SubRow { id: string; subdomain: string; type: string; target: string; is_active: number; created_at: number; user_id: string; user_email: string; user_name: string | null; }
interface EmailRow { id: string; alias: string; forward_to: string; is_active: number; created_at: number; user_id: string; user_email: string; user_name: string | null; }

export default function AdminResourcesPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [subdomains, setSubdomains] = useState<SubRow[]>([]);
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (searchQ = q, searchType = type) => {
    if (!searchQ.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/admin/resources?q=${encodeURIComponent(searchQ)}&type=${searchType}`);
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links ?? []);
        setSubdomains(data.subdomains ?? []);
        setEmails(data.emails ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [q, type]);

  async function deleteResource(rtype: string, id: string) {
    const label = rtype === "link" ? "링크" : rtype === "subdomain" ? "서브도메인" : "이메일";
    if (!confirm(`이 ${label}을 삭제하시겠습니까?`)) return;
    await fetch("/api/admin/resources", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: rtype, id }),
    });
    search();
  }

  async function toggleResource(rtype: string, id: string, currentActive: number) {
    await fetch("/api/admin/resources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: rtype, id, is_active: currentActive ? 0 : 1 }),
    });
    search();
  }

  const totalResults = links.length + subdomains.length + emails.length;

  return (
    <div style={{ padding: "32px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "8px" }}>리소스 관리</h1>
      <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", marginBottom: "24px" }}>URL 슬러그, 서브도메인, 이메일 별칭으로 리소스를 검색하고 관리합니다</p>

      {/* Search bar */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") search(); }}
            placeholder="슬러그, 서브도메인, 이메일, URL 검색..."
            style={{
              width: "100%", padding: "10px 12px 10px 40px",
              border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-md)",
              background: "var(--color-lifted)", fontSize: "0.9rem", color: "var(--color-ink)",
            }}
          />
        </div>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          style={{
            padding: "10px 12px", border: "1px solid var(--color-hairline)",
            borderRadius: "var(--radius-md)", fontSize: "0.875rem",
            background: "var(--color-lifted)", color: "var(--color-ink)",
          }}
        >
          <option value="all">전체</option>
          <option value="link">링크만</option>
          <option value="subdomain">서브도메인만</option>
          <option value="email">이메일만</option>
        </select>
        <button
          onClick={() => search()}
          disabled={loading || !q.trim()}
          className="btn btn-primary btn-pill"
          style={{ padding: "0 20px" }}
        >
          {loading ? "검색 중..." : "검색"}
        </button>
      </div>

      {!searched ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--color-muted)" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: "12px" }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p style={{ fontWeight: 600 }}>검색어를 입력하세요</p>
          <p style={{ fontSize: "0.875rem", marginTop: "4px" }}>슬러그, 서브도메인 이름, 이메일 별칭, URL 등으로 검색</p>
        </div>
      ) : loading ? (
        <p style={{ textAlign: "center", color: "var(--color-muted)", padding: "48px" }}>검색 중...</p>
      ) : totalResults === 0 ? (
        <p style={{ textAlign: "center", color: "var(--color-muted)", padding: "48px" }}>검색 결과가 없습니다.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Links */}
          {links.length > 0 && (
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>단축 링크 <span style={{ fontSize: "0.8125rem", fontWeight: 400, color: "var(--color-muted)" }}>({links.length}건)</span></h2>
              </div>
              <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table" style={{ minWidth: "700px" }}>
                    <thead>
                      <tr><th>슬러그</th><th>원본 URL</th><th>클릭</th><th>소유자</th><th>상태</th><th style={{ textAlign: "right" }}>관리</th></tr>
                    </thead>
                    <tbody>
                      {links.map(l => (
                        <tr key={l.id}>
                          <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.875rem", color: "#2563eb" }}>
                            <a href={`https://krl.kr/${l.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "none" }}>
                              krl.kr/{l.slug}
                            </a>
                          </td>
                          <td style={{ fontSize: "0.8125rem", color: "var(--color-muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <a href={l.original_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-muted)", textDecoration: "none" }}>{l.original_url}</a>
                          </td>
                          <td style={{ fontSize: "0.875rem" }}>{l.click_count}</td>
                          <td>
                            <Link href={`/dashboard/admin/users/${l.user_id}`} style={{ textDecoration: "none" }}>
                              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-ink)" }}>{l.user_name ?? l.user_email.split("@")[0]}</p>
                              <p style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{l.user_email}</p>
                            </Link>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.75rem", padding: "2px 7px", borderRadius: "4px", fontWeight: 600,
                              background: l.is_active ? "#05966920" : "#DC262220",
                              color: l.is_active ? "#059669" : "#DC2626" }}>
                              {l.is_active ? "활성" : "비활성"}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                              <button onClick={() => toggleResource("link", l.id, l.is_active)} className="btn btn-ghost btn-sm" style={{ fontSize: "0.8rem" }}>
                                {l.is_active ? "비활성" : "활성"}
                              </button>
                              <button onClick={() => deleteResource("link", l.id)} className="btn btn-ghost btn-sm" style={{ color: "#DC2626", fontSize: "0.8rem" }}>삭제</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Subdomains */}
          {subdomains.length > 0 && (
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>서브도메인 <span style={{ fontSize: "0.8125rem", fontWeight: 400, color: "var(--color-muted)" }}>({subdomains.length}건)</span></h2>
              </div>
              <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table" style={{ minWidth: "700px" }}>
                    <thead>
                      <tr><th>서브도메인</th><th>유형</th><th>대상</th><th>소유자</th><th>상태</th><th style={{ textAlign: "right" }}>관리</th></tr>
                    </thead>
                    <tbody>
                      {subdomains.map(s => (
                        <tr key={s.id}>
                          <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.875rem", color: "#7c3aed" }}>
                            <a href={`https://${s.subdomain}.krl.kr`} target="_blank" rel="noopener noreferrer" style={{ color: "#7c3aed", textDecoration: "none" }}>
                              {s.subdomain}.krl.kr
                            </a>
                          </td>
                          <td style={{ fontSize: "0.8125rem" }}>{s.type}</td>
                          <td style={{ fontSize: "0.8125rem", color: "var(--color-muted)", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.target}</td>
                          <td>
                            <Link href={`/dashboard/admin/users/${s.user_id}`} style={{ textDecoration: "none" }}>
                              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-ink)" }}>{s.user_name ?? s.user_email.split("@")[0]}</p>
                              <p style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{s.user_email}</p>
                            </Link>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.75rem", padding: "2px 7px", borderRadius: "4px", fontWeight: 600,
                              background: s.is_active ? "#05966920" : "#DC262220",
                              color: s.is_active ? "#059669" : "#DC2626" }}>
                              {s.is_active ? "활성" : "비활성"}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                              <button onClick={() => toggleResource("subdomain", s.id, s.is_active)} className="btn btn-ghost btn-sm" style={{ fontSize: "0.8rem" }}>
                                {s.is_active ? "비활성" : "활성"}
                              </button>
                              <button onClick={() => deleteResource("subdomain", s.id)} className="btn btn-ghost btn-sm" style={{ color: "#DC2626", fontSize: "0.8rem" }}>삭제</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Emails */}
          {emails.length > 0 && (
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                </svg>
                <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>이메일 별칭 <span style={{ fontSize: "0.8125rem", fontWeight: 400, color: "var(--color-muted)" }}>({emails.length}건)</span></h2>
              </div>
              <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table" style={{ minWidth: "700px" }}>
                    <thead>
                      <tr><th>별칭</th><th>전달 주소</th><th>소유자</th><th>상태</th><th style={{ textAlign: "right" }}>관리</th></tr>
                    </thead>
                    <tbody>
                      {emails.map(e => (
                        <tr key={e.id}>
                          <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.875rem", color: "#059669" }}>
                            {e.alias}@krl.kr
                          </td>
                          <td style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{e.forward_to}</td>
                          <td>
                            <Link href={`/dashboard/admin/users/${e.user_id}`} style={{ textDecoration: "none" }}>
                              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-ink)" }}>{e.user_name ?? e.user_email.split("@")[0]}</p>
                              <p style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{e.user_email}</p>
                            </Link>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.75rem", padding: "2px 7px", borderRadius: "4px", fontWeight: 600,
                              background: e.is_active ? "#05966920" : "#DC262220",
                              color: e.is_active ? "#059669" : "#DC2626" }}>
                              {e.is_active ? "활성" : "비활성"}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                              <button onClick={() => deleteResource("email", e.id)} className="btn btn-ghost btn-sm" style={{ color: "#DC2626", fontSize: "0.8rem" }}>삭제</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
