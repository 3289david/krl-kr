"use client";
import { useState } from "react";

export default function SnapshotDashboard() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function capture(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setResult(null); setError("");
    try {
      const r = await fetch(`/api/snapshot?url=${encodeURIComponent(url)}`);
      if (r.ok) {
        const blob = await r.blob();
        setResult(URL.createObjectURL(blob));
      } else {
        const d = await r.json();
        setError(d.error ?? "스크린샷 캡처 실패");
      }
    } catch { setError("네트워크 오류"); }
    setLoading(false);
  }

  const codeStyle = { background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 8, padding: "12px 16px", fontFamily: "monospace", fontSize: ".8125rem", color: "var(--color-muted)", overflowX: "auto" as const, display: "block" as const };

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>KRL Snapshot</h1>
        <p style={{ color: "var(--color-muted)", fontSize: ".875rem" }}>URL을 입력하면 웹사이트 스크린샷을 캡처합니다</p>
      </div>

      <form onSubmit={capture} style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          type="url"
          placeholder="https://example.com"
          required
          style={{ flex: 1, minWidth: 200, padding: "10px 14px", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: ".9375rem", background: "var(--color-surface)", color: "var(--color-ink)" }}
        />
        <button type="submit" disabled={loading} style={{ padding: "10px 20px", background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: ".9375rem", whiteSpace: "nowrap" }}>
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
              캡처 중...
            </span>
          ) : "스크린샷 캡처"}
        </button>
      </form>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {error && <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecdd3", borderRadius: 8, color: "#dc2626", fontSize: ".875rem", marginBottom: 16 }}>{error}</div>}

      {result && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p style={{ fontWeight: 600, fontSize: ".9375rem" }}>캡처 결과</p>
            <a href={result} download="snapshot.png" style={{ padding: "6px 14px", border: "1px solid var(--color-hairline)", borderRadius: 8, background: "transparent", color: "var(--color-body)", textDecoration: "none", fontSize: ".875rem" }}>다운로드</a>
          </div>
          <img src={result} alt="스크린샷" style={{ width: "100%", border: "1px solid var(--color-hairline)", borderRadius: 12 }} />
        </div>
      )}

      {/* API docs */}
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: 14, padding: "clamp(16px,4vw,24px)" }}>
        <h2 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 16 }}>API 사용 방법</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: ".875rem", marginBottom: 8 }}>기본 요청</p>
            <code style={codeStyle}>GET /api/snapshot?url=https://example.com</code>
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: ".875rem", marginBottom: 8 }}>파라미터</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[["url", "string", "필수. 캡처할 URL (http:// 또는 https://)"],["width","number","뷰포트 너비. 기본값: 1280"],["height","number","뷰포트 높이. 기본값: 800"]].map(([p, t, d]) => (
                <div key={p} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: ".875rem", flexWrap: "wrap" }}>
                  <code style={{ background: "var(--color-surface)", padding: "2px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: ".8125rem", color: "var(--color-accent)" }}>{p}</code>
                  <span style={{ color: "var(--color-muted)", fontSize: ".75rem" }}>{t}</span>
                  <span style={{ color: "var(--color-body)" }}>— {d}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: ".875rem", marginBottom: 8 }}>예시</p>
            <code style={codeStyle}>{`GET /api/snapshot?url=https://krl.kr&width=1280&height=800`}</code>
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: ".875rem", marginBottom: 8 }}>응답</p>
            <p style={{ fontSize: ".875rem", color: "var(--color-muted)", lineHeight: 1.6 }}>성공 시 <code style={{ background: "var(--color-surface)", padding: "1px 6px", borderRadius: 4 }}>image/png</code> 또는 <code style={{ background: "var(--color-surface)", padding: "1px 6px", borderRadius: 4 }}>image/svg+xml</code> (플레이스홀더)를 반환합니다. 실제 스크린샷은 환경 변수 <code style={{ background: "var(--color-surface)", padding: "1px 6px", borderRadius: 4 }}>SCREENSHOTONE_KEY</code> 설정 시 ScreenshotOne API를 사용합니다.</p>
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: ".875rem", marginBottom: 8 }}>JavaScript 예시</p>
            <code style={codeStyle}>{`const res = await fetch('/api/snapshot?url=https://example.com');
const blob = await res.blob();
const url = URL.createObjectURL(blob);`}</code>
          </div>
        </div>
      </div>
    </div>
  );
}
