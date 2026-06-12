"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Countdown { slug: string; title: string; description?: string; target_at: number; theme: string; view_count: number; }

function pad(n: number) { return String(n).padStart(2, "0"); }

export default function CountdownPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [cd, setCd] = useState<Countdown | null>(null);
  const [error, setError] = useState("");
  const [diff, setDiff] = useState<{ d: number; h: number; m: number; s: number; done: boolean } | null>(null);

  useEffect(() => {
    fetch(`/api/v1/countdown/${slug}`)
      .then(r => r.json())
      .then(data => { if (data.countdown) setCd(data.countdown); else setError(data.error ?? "오류"); })
      .catch(() => setError("로드 실패"));
  }, [slug]);

  useEffect(() => {
    if (!cd) return;
    const tick = () => {
      const now = Date.now();
      const rem = Number(cd.target_at) - now;
      if (rem <= 0) { setDiff({ d: 0, h: 0, m: 0, s: 0, done: true }); return; }
      const s = Math.floor(rem / 1000) % 60;
      const m = Math.floor(rem / 60000) % 60;
      const h = Math.floor(rem / 3600000) % 24;
      const d = Math.floor(rem / 86400000);
      setDiff({ d, h, m, s, done: false });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cd]);

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" }}>
      <p style={{ color: "#64748b", fontSize: "1rem" }}>{error}</p>
    </div>
  );

  if (!cd || !diff) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #334155", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const isDark = cd.theme !== "light";
  const bg = isDark ? "#0f172a" : "#f8fafc";
  const cardBg = isDark ? "#1e293b" : "#ffffff";
  const textPrimary = isDark ? "#f1f5f9" : "#0f172a";
  const textMuted = isDark ? "#64748b" : "#94a3b8";
  const accent = "#6366f1";

  return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.6} }
        .cd-unit { display:flex; flex-direction:column; align-items:center; gap:4px; }
        .cd-num { font-size:clamp(3rem,10vw,7rem); font-weight:800; line-height:1; font-variant-numeric:tabular-nums; color:${textPrimary}; }
        .cd-label { font-size:.75rem; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:${textMuted}; }
        .cd-sep { font-size:clamp(2rem,6vw,4rem); font-weight:300; color:${textMuted}; padding-bottom:24px; align-self:flex-start; padding-top:8px; }
        @media(max-width:480px){ .cd-row{ gap:12px!important; } }
      `}</style>

      <div style={{ maxWidth: 800, width: "100%", textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(1.25rem,4vw,2rem)", fontWeight: 700, color: textPrimary, marginBottom: 8 }}>{cd.title}</h1>
        {cd.description && <p style={{ color: textMuted, marginBottom: 40, fontSize: "clamp(.875rem,2vw,1rem)" }}>{cd.description}</p>}

        {diff.done ? (
          <div style={{ padding: "32px", background: cardBg, borderRadius: 20, border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}` }}>
            <p style={{ fontSize: "2rem", fontWeight: 800, color: accent }}>완료되었습니다!</p>
            <p style={{ color: textMuted, marginTop: 8 }}>{cd.title}이(가) 도래했습니다.</p>
          </div>
        ) : (
          <div className="cd-row" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
            <div className="cd-unit"><span className="cd-num">{String(diff.d).padStart(2, "0")}</span><span className="cd-label">일</span></div>
            <span className="cd-sep">:</span>
            <div className="cd-unit"><span className="cd-num">{pad(diff.h)}</span><span className="cd-label">시간</span></div>
            <span className="cd-sep">:</span>
            <div className="cd-unit"><span className="cd-num">{pad(diff.m)}</span><span className="cd-label">분</span></div>
            <span className="cd-sep">:</span>
            <div className="cd-unit"><span className="cd-num">{pad(diff.s)}</span><span className="cd-label">초</span></div>
          </div>
        )}

        <p style={{ marginTop: 48, color: textMuted, fontSize: ".75rem" }}>
          목표일: {new Date(Number(cd.target_at)).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <a href="https://krl.kr" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 32, color: textMuted, fontSize: ".75rem", textDecoration: "none", padding: "6px 14px", borderRadius: 99, border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}` }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          KRL.KR로 만들기
        </a>
      </div>
    </div>
  );
}
