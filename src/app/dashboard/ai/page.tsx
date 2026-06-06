"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface GeneratedImage {
  base64?: string;
  mime_type?: string;
  model?: string;
  prompt: string;
  timestamp: number;
  seed?: number;
  drive_file_id?: number | null;
}

const PLAN_LABEL: Record<string, string> = { free: "Free", pro: "Pro", vip: "VIP" };
const PLAN_COLOR: Record<string, string> = { free: "#6b7280", pro: "#2563eb", vip: "#7c3aed" };
const DAILY_LIMITS: Record<string, number> = { free: 5, pro: 50, vip: 200 };

const SIZES = [
  { label: "1:1 정방형 (1024×1024)", w: 1024, h: 1024 },
  { label: "16:9 와이드 (1024×576)", w: 1024, h: 576 },
  { label: "9:16 세로 (576×1024)", w: 576, h: 1024 },
  { label: "4:3 (1024×768)", w: 1024, h: 768 },
];

export default function AIImagePage() {
  const [plan, setPlan] = useState("free");
  const [usedToday, setUsedToday] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [sizeIdx, setSizeIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<GeneratedImage[]>([]);

  useEffect(() => {
    fetch("/api/v1/ai/image")
      .then(r => r.json())
      .then(d => {
        setPlan(d.plan ?? "free");
        setUsedToday(d.used_today ?? 0);
        setDailyLimit(d.daily_limit ?? DAILY_LIMITS[d.plan ?? "free"]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setError("");

    const { w, h } = SIZES[sizeIdx];

    try {
      const res = await fetch("/api/v1/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), width: w, height: h }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "이미지 생성에 실패했습니다.");
        return;
      }
      setUsedToday(data.used_today ?? usedToday + 1);
      setHistory(prev => [{ ...data, prompt: prompt.trim(), timestamp: Date.now() }, ...prev.slice(0, 19)]);
      setPrompt("");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  }

  function downloadImage(img: GeneratedImage) {
    if (!img.base64) return;
    const a = document.createElement("a");
    a.href = `data:${img.mime_type ?? "image/png"};base64,${img.base64}`;
    a.download = `krl-ai-${img.timestamp}.png`;
    a.click();
  }

  const remaining = dailyLimit - usedToday;
  const limitPct = Math.min(100, (usedToday / dailyLimit) * 100);

  const BMC = "https://buymeacoffee.com/rukkitofficial/membership";

  if (loading) return (
    <div className="dashboard-page">
      <p style={{ color: "var(--color-muted)", textAlign: "center", padding: 48 }}>불러오는 중...</p>
    </div>
  );

  if (plan === "free") return (
    <div className="dashboard-page">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 4px" }}>AI 이미지 생성</h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", margin: 0 }}>Pollinations AI</p>
      </div>
      <div style={{ padding: "48px 32px", background: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)", borderRadius: 20, textAlign: "center" }}>
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth={1.5} style={{ margin: "0 auto 20px", display: "block" }}>
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
        </svg>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: "-0.02em" }}>유료 플랜 전용 기능</h2>
        <p style={{ fontSize: "0.9375rem", color: "#c7d2fe", marginBottom: 8, lineHeight: 1.6 }}>
          AI 이미지 생성은 Pro 이상 플랜에서 사용할 수 있습니다.
        </p>
        <p style={{ fontSize: "0.9375rem", color: "#c7d2fe", marginBottom: 32, lineHeight: 1.6 }}>
          Pro: <strong style={{ color: "#fff" }}>50장/일</strong> &nbsp;·&nbsp; VIP: <strong style={{ color: "#fff" }}>200장/일 (고화질)</strong>
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href={BMC} target="_blank" rel="noreferrer" style={{
            padding: "12px 28px", background: "#6366f1", color: "#fff",
            borderRadius: 10, fontWeight: 700, textDecoration: "none", fontSize: "0.9375rem",
          }}>
            지금 구독하기
          </a>
          <a href="/pricing" style={{
            padding: "12px 28px", background: "rgba(255,255,255,0.12)", color: "#fff",
            borderRadius: 10, fontWeight: 600, textDecoration: "none", fontSize: "0.9375rem",
          }}>
            요금제 보기
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 4px" }}>AI 이미지 생성</h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", margin: 0 }}>
            Pollinations AI · <span style={{ fontWeight: 600, color: PLAN_COLOR[plan] }}>{PLAN_LABEL[plan]}</span> 플랜
          </p>
        </div>
        {/* Daily usage bar */}
        <div style={{ minWidth: 180, textAlign: "right" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginBottom: 5 }}>
            오늘 사용: <strong style={{ color: remaining === 0 ? "#dc2626" : "var(--color-ink)" }}>{usedToday}</strong> / {dailyLimit}장
          </div>
          <div style={{ height: 6, background: "var(--color-hairline)", borderRadius: 99, overflow: "hidden", width: 180 }}>
            <div style={{ height: "100%", width: `${limitPct}%`, background: remaining === 0 ? "#dc2626" : PLAN_COLOR[plan], borderRadius: 99, transition: "width 0.3s" }} />
          </div>
          {plan !== "vip" && (
            <Link href="/pricing" style={{ fontSize: "0.75rem", color: PLAN_COLOR[plan], textDecoration: "none", fontWeight: 600, marginTop: 4, display: "inline-block" }}>
              업그레이드 →
            </Link>
          )}
        </div>
      </div>

      {/* Generator */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 16, padding: 24, marginBottom: 28 }}>
        <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: 7 }}>프롬프트</label>
            <textarea
              className="input"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="A serene Japanese garden with cherry blossoms at sunset, oil painting style..."
              rows={3}
              style={{ resize: "vertical", fontFamily: "inherit" }}
              disabled={generating}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: 5 }}>
              영어로 작성하면 결과가 더 좋습니다.
            </p>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: 7 }}>크기</label>
              <select className="input" value={sizeIdx} onChange={e => setSizeIdx(Number(e.target.value))} disabled={generating}>
                {SIZES.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={generating || !prompt.trim() || remaining === 0}
                style={{ height: 42 }}
              >
                {generating ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    생성 중... (최대 30초)
                  </span>
                ) : remaining === 0 ? "오늘 한도 소진" : `이미지 생성 (${remaining}장 남음)`}
              </button>
            </div>
          </div>

          {remaining === 0 && (
            <div style={{ padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, fontSize: "0.875rem", color: "#991b1b", display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              오늘 한도({dailyLimit}장)를 모두 사용했습니다. 내일 자정에 초기화되거나{" "}
              <Link href="/pricing" style={{ color: "#2563eb", fontWeight: 600 }}>플랜을 업그레이드</Link>하세요.
            </div>
          )}

          {error && (
            <div style={{ padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, fontSize: "0.875rem", color: "#991b1b" }}>
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Plan limits info */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
        {[
          { name: "Free", limit: "불가", model: "—", color: "#6b7280", active: plan === "free" },
          { name: "Pro", limit: "50장/일", model: "flux + enhance", color: "#2563eb", active: plan === "pro" },
          { name: "VIP", limit: "200장/일", model: "flux-pro + enhance", color: "#7c3aed", active: plan === "vip" },
        ].map(p => (
          <div key={p.name} style={{
            flex: 1, minWidth: 120, padding: "12px 14px", borderRadius: 10,
            border: `1.5px solid ${p.active ? p.color : "var(--color-hairline)"}`,
            background: p.active ? `${p.color}10` : "var(--color-surface)",
          }}>
            <div style={{ fontWeight: 700, color: p.color, fontSize: "0.8125rem", marginBottom: 3 }}>{p.name}</div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{p.limit}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{p.model}</div>
          </div>
        ))}
      </div>

      {/* History */}
      {history.length > 0 ? (
        <div>
          <h2 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 16, letterSpacing: "-0.01em" }}>생성된 이미지</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {history.map((img, i) => (
              <div key={i} style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 12, overflow: "hidden" }}>
                {img.base64 && (
                  <img
                    src={`data:${img.mime_type ?? "image/png"};base64,${img.base64}`}
                    alt={img.prompt}
                    style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 300 }}
                    loading="lazy"
                  />
                )}
                <div style={{ padding: "12px 14px" }}>
                  <p style={{
                    fontSize: "0.8125rem", color: "var(--color-muted)", margin: "0 0 10px", lineHeight: 1.5,
                    overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  }}>
                    {img.prompt}
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--color-muted)", background: "var(--color-canvas)", padding: "2px 8px", borderRadius: 99, border: "1px solid var(--color-hairline)" }}>
                      {img.model ?? "flux"}
                    </span>
                    <div style={{ display: "flex", gap: 6, marginLeft: "auto", alignItems: "center" }}>
                      {img.drive_file_id && (
                        <Link href="/dashboard/drive" style={{ fontSize: "0.7rem", color: "#2563eb", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M16 6l-4-4-4 4M12 2v13"/></svg>
                          Drive 저장됨
                        </Link>
                      )}
                      <button onClick={() => downloadImage(img)} className="btn btn-sm btn-ghost" style={{ fontSize: "0.75rem" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                        다운로드
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "48px 32px", color: "var(--color-muted)", background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-hairline)" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ margin: "0 auto 12px", opacity: 0.35 }}>
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
          </svg>
          <p style={{ fontSize: "0.9375rem" }}>프롬프트를 입력하고 이미지를 생성해 보세요.</p>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
