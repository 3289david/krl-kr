"use client";
import { useState } from "react";

interface DepResult {
  name: string; description?: string; latest?: string; version_count?: number;
  downloads_last_month?: number; license?: string; homepage?: string;
  repository?: string; keywords?: string[]; dependencies: string[];
  dev_dependencies: string[]; peer_dependencies: string[];
  dep_count: number; dev_dep_count: number; scripts: string[];
  risk_level: string; risk_factors: string[]; npm_url?: string;
}

const inputStyle = { padding: "10px 14px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".9375rem", background: "var(--color-canvas)", color: "var(--color-ink)", boxSizing: "border-box" as const };
const riskColors = { 낮음: { bg: "#dcfce7", color: "#166534" }, 보통: { bg: "#fef9c3", color: "#854d0e" }, 높음: { bg: "#fee2e2", color: "#dc2626" } } as Record<string, { bg: string; color: string }>;

export default function DepmapDashboard() {
  const [pkg, setPkg] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DepResult | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  async function search(name?: string) {
    const q = (name ?? pkg).trim();
    if (!q) return;
    setLoading(true); setError(""); setResult(null);
    const r = await fetch(`/api/depmap?pkg=${encodeURIComponent(q)}`);
    const d = await r.json();
    if (!r.ok) { setError(d.error ?? "오류가 발생했습니다."); }
    else { setResult(d); setHistory(prev => [q, ...prev.filter(x => x !== q)].slice(0, 10)); }
    setLoading(false);
  }

  const riskStyle = result ? (riskColors[result.risk_level] ?? { bg: "#f1f5f9", color: "#64748b" }) : null;

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>KRL Dependency Map</h1>
        <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>npm 패키지 의존성 지도 및 보안 분석</p>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        <input value={pkg} onChange={e => setPkg(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder="패키지 이름 입력 (예: express, react, lodash)" style={{ ...inputStyle, flex: 1 }} />
        <button onClick={() => search()} disabled={loading || !pkg.trim()} style={{ padding: "10px 24px", background: "var(--color-ink)", color: "var(--color-canvas)", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".875rem" }}>{loading ? "검색 중..." : "분석"}</button>
      </div>

      {history.length > 0 && !result && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: ".8125rem", color: "var(--color-muted)", marginBottom: 8 }}>최근 검색</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {history.map(h => (
              <button key={h} onClick={() => { setPkg(h); search(h); }} style={{ padding: "4px 12px", border: "1px solid var(--color-hairline)", borderRadius: 99, background: "var(--color-canvas)", cursor: "pointer", fontSize: ".8125rem", color: "var(--color-body)" }}>{h}</button>
            ))}
          </div>
        </div>
      )}

      {error && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "12px 16px", borderRadius: 10, marginBottom: 20, fontSize: ".875rem" }}>{error}</div>}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 14, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <h2 style={{ fontWeight: 700, fontSize: "1.25rem", margin: 0 }}>{result.name}</h2>
                  {result.latest && <span style={{ fontSize: ".8125rem", padding: "2px 10px", background: "#f1f5f9", borderRadius: 99, color: "#475569" }}>v{result.latest}</span>}
                  {result.license && <span style={{ fontSize: ".8125rem", padding: "2px 10px", background: "#f0fdf4", borderRadius: 99, color: "#166534" }}>{result.license}</span>}
                  {riskStyle && <span style={{ fontSize: ".8125rem", padding: "2px 10px", borderRadius: 99, background: riskStyle.bg, color: riskStyle.color, fontWeight: 600 }}>보안위험: {result.risk_level}</span>}
                </div>
                {result.description && <p style={{ color: "var(--color-body)", fontSize: ".9375rem", lineHeight: 1.6 }}>{result.description}</p>}
                {result.keywords && result.keywords.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {result.keywords.slice(0, 8).map(k => <span key={k} style={{ fontSize: ".75rem", padding: "2px 8px", background: "var(--color-canvas)", borderRadius: 99, color: "var(--color-muted)", border: "1px solid var(--color-hairline)" }}>{k}</span>)}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {result.npm_url && <a href={result.npm_url} target="_blank" rel="noopener" style={{ padding: "6px 14px", border: "1px solid var(--color-hairline)", borderRadius: 8, color: "var(--color-body)", textDecoration: "none", fontSize: ".8125rem" }}>npm</a>}
                {result.repository && <a href={result.repository.replace(/^git\+/, "").replace(/\.git$/, "")} target="_blank" rel="noopener" style={{ padding: "6px 14px", border: "1px solid var(--color-hairline)", borderRadius: 8, color: "var(--color-body)", textDecoration: "none", fontSize: ".8125rem" }}>저장소</a>}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginTop: 20 }}>
              {[
                ["월 다운로드", result.downloads_last_month?.toLocaleString() ?? "N/A"],
                ["버전 수", result.version_count ?? "N/A"],
                ["의존성", result.dep_count],
                ["개발 의존성", result.dev_dep_count],
                ["스크립트", result.scripts.length],
              ].map(([label, val]) => (
                <div key={label as string} style={{ background: "var(--color-canvas)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-ink)" }}>{val}</div>
                  <div style={{ fontSize: ".75rem", color: "var(--color-muted)", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {result.risk_factors.length > 0 && (
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "16px 20px" }}>
              <h3 style={{ fontWeight: 600, fontSize: ".9375rem", color: "#c2410c", marginBottom: 8 }}>보안 위험 요소</h3>
              <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 4 }}>
                {result.risk_factors.map(f => <li key={f} style={{ fontSize: ".875rem", color: "#7c2d12" }}>{f}</li>)}
              </ul>
            </div>
          )}

          {result.dependencies.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 12, padding: "18px 20px" }}>
              <h3 style={{ fontWeight: 600, fontSize: ".9375rem", marginBottom: 12 }}>의존성 ({result.dependencies.length}개)</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.dependencies.map(d => (
                  <button key={d} onClick={() => { setPkg(d); search(d); }} style={{ padding: "4px 12px", border: "1px solid var(--color-hairline)", borderRadius: 99, background: "var(--color-canvas)", cursor: "pointer", fontSize: ".8125rem", color: "var(--color-body)" }}>{d}</button>
                ))}
              </div>
            </div>
          )}

          {result.dev_dependencies.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 12, padding: "18px 20px" }}>
              <h3 style={{ fontWeight: 600, fontSize: ".9375rem", marginBottom: 12 }}>개발 의존성 ({result.dev_dependencies.length}개)</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.dev_dependencies.map(d => (
                  <button key={d} onClick={() => { setPkg(d); search(d); }} style={{ padding: "4px 12px", border: "1px solid var(--color-hairline)", borderRadius: 99, background: "#f8fafc", cursor: "pointer", fontSize: ".8125rem", color: "var(--color-muted)" }}>{d}</button>
                ))}
              </div>
            </div>
          )}

          {result.scripts.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid var(--color-hairline)", borderRadius: 12, padding: "18px 20px" }}>
              <h3 style={{ fontWeight: 600, fontSize: ".9375rem", marginBottom: 10 }}>스크립트</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.scripts.map(s => <span key={s} style={{ padding: "3px 10px", background: "var(--color-canvas)", borderRadius: 6, fontSize: ".8125rem", fontFamily: "monospace", color: "var(--color-ink)", border: "1px solid var(--color-hairline)" }}>{s}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
