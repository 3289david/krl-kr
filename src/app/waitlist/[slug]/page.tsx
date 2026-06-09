"use client";
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";

interface Waitlist { slug: string; name: string; description?: string; cta: string; referral_enabled: number; is_open: number; goal?: number; signup_count: number; }

export default function WaitlistPage() {
  const params = useParams();
  const sp = useSearchParams();
  const slug = params.slug as string;
  const ref = sp.get("ref") ?? "";

  const [wl, setWl] = useState<Waitlist | null>(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ position?: number; referral_url?: string; already?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/waitlist/${slug}`)
      .then(r => r.json())
      .then(d => { if (d.waitlist) setWl(d.waitlist); else setError(d.error ?? "오류"); })
      .catch(() => setError("로드 실패"));
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await fetch(`/api/v1/waitlist/${slug}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, ref }),
      });
      const d = await r.json();
      if (d.ok) setResult(d);
      else setError(d.error ?? "오류가 발생했습니다.");
    } catch { setError("네트워크 오류"); }
    setSubmitting(false);
  }

  function copy(url: string) {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  if (error && !wl) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#64748b" }}>{error}</p>
    </div>
  );

  if (!wl) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const pct = wl.goal ? Math.min(100, Math.round((Number(wl.signup_count) / wl.goal) * 100)) : null;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#f8fafc,#eff6ff)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "system-ui,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ maxWidth: 480, width: "100%", background: "#fff", borderRadius: 20, padding: "clamp(24px,5vw,48px)", boxShadow: "0 20px 60px rgba(0,0,0,.08)" }}>
        <h1 style={{ fontSize: "clamp(1.5rem,4vw,2rem)", fontWeight: 800, color: "#0f172a", marginBottom: 8, letterSpacing: "-0.02em" }}>{wl.name}</h1>
        {wl.description && <p style={{ color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>{wl.description}</p>}

        {pct !== null && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".8125rem", color: "#64748b", marginBottom: 6 }}>
              <span>{Number(wl.signup_count).toLocaleString()}명 등록</span>
              <span>목표: {wl.goal?.toLocaleString()}명</span>
            </div>
            <div style={{ height: 6, background: "#e2e8f0", borderRadius: 99 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 99, transition: "width .3s" }} />
            </div>
          </div>
        )}

        {!pct && Number(wl.signup_count) > 0 && (
          <p style={{ fontSize: ".875rem", color: "#6366f1", fontWeight: 600, marginBottom: 20 }}>
            {Number(wl.signup_count).toLocaleString()}명이 대기 중입니다.
          </p>
        )}

        {result ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 style={{ fontWeight: 700, fontSize: "1.25rem", marginBottom: 8 }}>
              {result.already ? "이미 등록되어 있습니다." : "등록 완료!"}
            </h2>
            {result.position && <p style={{ color: "#64748b", marginBottom: 20 }}>대기 순번 <strong style={{ color: "#6366f1" }}>#{result.position}</strong></p>}
            {result.referral_url && wl.referral_enabled ? (
              <div>
                <p style={{ fontSize: ".875rem", color: "#64748b", marginBottom: 10 }}>친구를 초대하면 순위가 올라갑니다!</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input readOnly value={result.referral_url} style={{ flex: 1, padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: ".8125rem", background: "#f8fafc", color: "#334155" }} />
                  <button onClick={() => copy(result.referral_url!)} style={{ padding: "8px 16px", background: copied ? "#10b981" : "#6366f1", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: ".875rem", whiteSpace: "nowrap" }}>
                    {copied ? "복사됨" : "복사"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : !wl.is_open ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b" }}>등록이 마감되었습니다.</div>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {error && <p style={{ color: "#ef4444", fontSize: ".875rem" }}>{error}</p>}
            <input value={name} onChange={e => setName(e.target.value)} placeholder="이름 (선택)" style={{ padding: "12px 16px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: ".9375rem", outline: "none", fontFamily: "inherit" }} />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일 주소 *" required style={{ padding: "12px 16px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: ".9375rem", outline: "none", fontFamily: "inherit" }} />
            <button type="submit" disabled={submitting} style={{ padding: "14px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 10, fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>
              {submitting ? "등록 중..." : wl.cta || "사전 등록하기"}
            </button>
            {ref && <p style={{ fontSize: ".75rem", color: "#94a3b8", textAlign: "center" }}>추천인 코드: {ref}</p>}
          </form>
        )}

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <a href="https://krl.kr" style={{ color: "#94a3b8", fontSize: ".75rem", textDecoration: "none" }}>KRL Waitlist로 만들어진 페이지</a>
        </div>
      </div>
    </div>
  );
}
