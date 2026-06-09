"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Project { id: string; slug: string; name: string; tagline?: string; description?: string; status: string; website_url?: string; github_url?: string; twitter_url?: string; logo_text?: string; accent_color: string; contact_email?: string; created_at: number; }
interface ChangelogEntry { id: string; version?: string; title: string; content: string; created_at: number; }

const STATUS_MAP: Record<string, string> = { building: "개발 중", beta: "베타", live: "정식 출시", archived: "아카이브" };
const STATUS_COLOR: Record<string, string> = { building: "#f59e0b", beta: "#3b82f6", live: "#10b981", archived: "#6b7280" };

function relDate(ts: number) { return new Date(ts).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }); }

export default function LaunchpadPage() {
  const { slug } = useParams() as { slug: string };
  const [project, setProject] = useState<Project | null>(null);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [error, setError] = useState("");
  const [fbName, setFbName] = useState("");
  const [fbContent, setFbContent] = useState("");
  const [fbType, setFbType] = useState("general");
  const [fbMsg, setFbMsg] = useState("");
  const [submittingFb, setSubmittingFb] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/launchpad/${slug}`)
      .then(r => r.json())
      .then(d => { if (d.project) { setProject(d.project); setChangelog(d.changelog ?? []); } else setError(d.error ?? "오류"); })
      .catch(() => setError("로드 실패"));
  }, [slug]);

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingFb(true); setFbMsg("");
    try {
      const r = await fetch(`/api/v1/launchpad/${slug}/feedback`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author_name: fbName, type: fbType, content: fbContent }),
      });
      const d = await r.json();
      if (d.ok) { setFbContent(""); setFbName(""); setFbMsg("피드백을 보내주셔서 감사합니다!"); }
      else setFbMsg(d.error ?? "오류");
    } catch { setFbMsg("네트워크 오류"); }
    setSubmittingFb(false);
  }

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#64748b" }}>{error}</p>
    </div>
  );
  if (!project) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTop: `3px solid #6366f1`, borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const ac = project.accent_color || "#6366f1";

  return (
    <div style={{ minHeight: "100vh", fontFamily: "system-ui,sans-serif", color: "#0f172a" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${ac}18, ${ac}05)`, borderBottom: "1px solid #e2e8f0", padding: "clamp(32px,6vw,80px) clamp(16px,4vw,48px)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: ac, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", color: "#fff", fontWeight: 800, flexShrink: 0 }}>
              {project.logo_text ? project.logo_text.slice(0, 2) : project.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>{project.name}</h1>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".8125rem", fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: `${STATUS_COLOR[project.status]}20`, color: STATUS_COLOR[project.status] }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLOR[project.status] }} />
                {STATUS_MAP[project.status] ?? project.status}
              </span>
            </div>
          </div>

          {project.tagline && <p style={{ fontSize: "clamp(1.125rem,2.5vw,1.375rem)", color: "#334155", lineHeight: 1.5, marginBottom: 20 }}>{project.tagline}</p>}
          {project.description && <p style={{ color: "#64748b", lineHeight: 1.7, marginBottom: 28 }}>{project.description}</p>}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {project.website_url && (
              <a href={project.website_url} target="_blank" rel="noopener" style={{ padding: "10px 20px", background: ac, color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: ".9375rem" }}>웹사이트 방문</a>
            )}
            {project.github_url && (
              <a href={project.github_url} target="_blank" rel="noopener" style={{ padding: "10px 20px", background: "#f1f5f9", color: "#334155", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: ".9375rem", display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                GitHub
              </a>
            )}
            {project.contact_email && (
              <a href={`mailto:${project.contact_email}`} style={{ padding: "10px 20px", background: "#f1f5f9", color: "#334155", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: ".9375rem" }}>문의하기</a>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,48px)" }}>
        {/* Changelog */}
        {changelog.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 20, color: "#0f172a" }}>업데이트 내역</h2>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 11, top: 0, bottom: 0, width: 2, background: "#e2e8f0" }} />
              {changelog.map(cl => (
                <div key={cl.id} style={{ display: "flex", gap: 20, marginBottom: 24 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: ac, flexShrink: 0, marginTop: 2, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      {cl.version && <span style={{ fontSize: ".75rem", padding: "2px 8px", background: `${ac}20`, color: ac, borderRadius: 99, fontWeight: 600 }}>{cl.version}</span>}
                      <h3 style={{ fontWeight: 700, fontSize: "1rem", margin: 0 }}>{cl.title}</h3>
                      <span style={{ fontSize: ".75rem", color: "#94a3b8", marginLeft: "auto" }}>{relDate(cl.created_at)}</span>
                    </div>
                    <p style={{ color: "#64748b", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>{cl.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Feedback */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>피드백 보내기</h2>
          <p style={{ color: "#64748b", marginBottom: 20, fontSize: ".9375rem" }}>버그 신고, 기능 제안, 기타 의견을 남겨주세요.</p>
          <form onSubmit={submitFeedback} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: "clamp(16px,4vw,24px)", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[["general","일반"],["bug","버그"],["feature","기능 제안"],["other","기타"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setFbType(v)} style={{ padding: "6px 14px", borderRadius: 99, border: `1px solid ${fbType === v ? ac : "#e2e8f0"}`, background: fbType === v ? `${ac}15` : "transparent", color: fbType === v ? ac : "#64748b", cursor: "pointer", fontSize: ".8125rem", fontWeight: fbType === v ? 600 : 400 }}>{l}</button>
              ))}
            </div>
            <input value={fbName} onChange={e => setFbName(e.target.value)} placeholder="이름 (선택)" style={{ padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: ".875rem", fontFamily: "inherit", outline: "none", background: "#fff" }} />
            <textarea value={fbContent} onChange={e => setFbContent(e.target.value)} placeholder="피드백 내용 *" required rows={4} style={{ padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: ".875rem", fontFamily: "inherit", outline: "none", resize: "vertical", background: "#fff" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {fbMsg ? <p style={{ fontSize: ".8125rem", color: fbMsg.includes("감사") ? "#10b981" : "#ef4444" }}>{fbMsg}</p> : <div />}
              <button type="submit" disabled={submittingFb} style={{ padding: "10px 24px", background: ac, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: ".9375rem" }}>
                {submittingFb ? "전송 중..." : "피드백 보내기"}
              </button>
            </div>
          </form>
        </section>

        <div style={{ marginTop: 48, textAlign: "center" }}>
          <a href="https://krl.kr" style={{ color: "#94a3b8", fontSize: ".75rem", textDecoration: "none" }}>KRL Launchpad로 만들어진 페이지</a>
        </div>
      </div>
    </div>
  );
}
