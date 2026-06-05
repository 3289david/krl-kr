"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface GeneratedImage {
  url?: string;
  base64?: string;
  revised_prompt?: string;
  model?: string;
  prompt: string;
  timestamp: number;
}

export default function AIImagePage() {
  const [plan, setPlan] = useState<string>("free");
  const [planLoading, setPlanLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<"vivid" | "natural">("vivid");
  const [size, setSize] = useState("1024x1024");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/v1/plan")
      .then(r => r.json())
      .then(d => setPlan(d.plan ?? "free"))
      .catch(() => {})
      .finally(() => setPlanLoading(false));
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setGenerating(true); setError("");

    try {
      const res = await fetch("/api/v1/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), style, size }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgrade_required) {
          setError("이미지 생성은 Pro 이상 플랜에서 사용 가능합니다.");
        } else {
          setError(data.error ?? "이미지 생성에 실패했습니다.");
        }
        return;
      }
      setHistory(prev => [{ ...data, prompt: prompt.trim(), timestamp: Date.now() }, ...prev.slice(0, 19)]);
      setPrompt("");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
    setGenerating(false);
  }

  async function downloadImage(img: GeneratedImage) {
    const url = img.url ?? (img.base64 ? `data:image/png;base64,${img.base64}` : null);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `krl-ai-${img.timestamp}.${img.base64 ? "png" : "jpg"}`;
    a.click();
  }

  if (planLoading) return (
    <div className="dashboard-page">
      <p style={{ color: "var(--color-muted)", textAlign: "center", padding: 48 }}>불러오는 중...</p>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 4px" }}>AI 이미지 생성</h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>
          텍스트로 이미지를 만들어 보세요.
          {" "}
          <span style={{ fontWeight: 600, textTransform: "uppercase", color: plan === "free" ? "#6b7280" : plan === "pro" ? "#2563eb" : "#7c3aed" }}>
            {plan}
          </span>
          {" "}플랜
        </p>
      </div>

      {plan === "free" ? (
        <div style={{ padding: 32, background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", borderRadius: 16, textAlign: "center", color: "#e0e7ff" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth={1.5} style={{ margin: "0 auto 16px" }}>
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
          </svg>
          <h2 style={{ fontSize: "1.375rem", fontWeight: 700, marginBottom: 12, color: "#fff" }}>Pro 플랜이 필요합니다</h2>
          <p style={{ fontSize: "0.9375rem", marginBottom: 24, color: "#c7d2fe" }}>
            AI 이미지 생성(DALL-E 3)은 Pro 이상 플랜에서 사용 가능합니다.<br />
            Pro: 월 200장 · VIP: 월 1,000장
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/pricing" style={{ padding: "10px 24px", background: "#6366f1", color: "#fff", borderRadius: 10, fontWeight: 700, textDecoration: "none", fontSize: "0.9375rem" }}>
              요금제 보기
            </Link>
            <Link href="/dashboard/settings" style={{ padding: "10px 24px", background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 10, fontWeight: 600, textDecoration: "none", fontSize: "0.9375rem" }}>
              BMC 인증
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Generator form */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 16, padding: 24, marginBottom: 28 }}>
            <form onSubmit={handleGenerate}>
              <div className="form-group">
                <label className="form-label">프롬프트</label>
                <textarea
                  ref={promptRef}
                  className="input"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="A serene Japanese garden with cherry blossoms and a stone lantern, digital art style..."
                  rows={3}
                  style={{ resize: "vertical", fontFamily: "inherit" }}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
                  <label className="form-label">스타일</label>
                  <select className="input" value={style} onChange={e => setStyle(e.target.value as "vivid" | "natural")}>
                    <option value="vivid">Vivid (선명한)</option>
                    <option value="natural">Natural (자연스러운)</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
                  <label className="form-label">크기</label>
                  <select className="input" value={size} onChange={e => setSize(e.target.value)}>
                    <option value="1024x1024">1024 x 1024 (정방형)</option>
                    <option value="1792x1024">1792 x 1024 (와이드)</option>
                    <option value="1024x1792">1024 x 1792 (세로)</option>
                  </select>
                </div>
              </div>
              {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
              <button type="submit" className="btn btn-primary" disabled={generating || !prompt.trim()}>
                {generating ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    생성 중... (최대 30초)
                  </span>
                ) : "이미지 생성"}
              </button>
            </form>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div>
              <h2 style={{ fontWeight: 600, fontSize: "1rem", marginBottom: 16 }}>생성된 이미지</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {history.map((img, i) => (
                  <div key={i} style={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 12, overflow: "hidden" }}>
                    {img.url ? (
                      <img src={img.url} alt={img.prompt} style={{ width: "100%", display: "block", objectFit: "cover" }} loading="lazy" />
                    ) : img.base64 ? (
                      <img src={`data:image/png;base64,${img.base64}`} alt={img.prompt} style={{ width: "100%", display: "block" }} />
                    ) : null}
                    <div style={{ padding: "12px 14px" }}>
                      <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", margin: "0 0 10px", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {img.revised_prompt ?? img.prompt}
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        {img.url && (
                          <a href={img.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost" style={{ fontSize: "0.75rem" }}>열기</a>
                        )}
                        <button onClick={() => downloadImage(img)} className="btn btn-sm btn-ghost" style={{ fontSize: "0.75rem" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" /></svg>
                          다운로드
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {history.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 32px", color: "var(--color-muted)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ margin: "0 auto 12px", opacity: 0.4 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
              </svg>
              <p style={{ fontSize: "0.9375rem" }}>아직 생성된 이미지가 없습니다.<br />위에 프롬프트를 입력하고 생성해 보세요.</p>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
