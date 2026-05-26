"use client";
import { useState, useEffect, useRef } from "react";

interface WebhookRequest {
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string | null;
  ip: string | null;
  received_at: string;
}

interface Endpoint {
  slug: string;
  url: string;
  label: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "#3b82f6",
  POST: "#22c55e",
  PUT: "#f59e0b",
  PATCH: "#8b5cf6",
  DELETE: "#ef4444",
  HEAD: "#6b7280",
  OPTIONS: "#6b7280",
};

export default function PublicWebhookPage() {
  const [endpoint, setEndpoint] = useState<Endpoint | null>(null);
  const [requests, setRequests] = useState<WebhookRequest[]>([]);
  const [selected, setSelected] = useState<WebhookRequest | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function createEndpoint() {
    setCreating(true);
    try {
      const res = await fetch("/api/v1/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "공개 웹훅" }),
      });
      const data = await res.json();
      if (res.ok) {
        setEndpoint({ slug: data.slug, url: data.url ?? `https://krl.kr/api/v1/webhook/${data.slug}`, label: data.label });
        setRequests([]);
        setSelected(null);
      }
    } finally {
      setCreating(false);
    }
  }

  async function fetchRequests() {
    if (!endpoint) return;
    try {
      const res = await fetch(`/api/v1/webhook/${endpoint.slug}?inspect=1`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!endpoint) return;
    fetchRequests();
    intervalRef.current = setInterval(fetchRequests, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [endpoint]);

  function copyUrl() {
    if (!endpoint) return;
    navigator.clipboard.writeText(endpoint.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("ko-KR");
  }

  function tryParseJson(str: string | null) {
    if (!str) return null;
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  }

  return (
    <main>
      <section className="section" style={{ paddingBottom: "48px" }}>
        <div className="container" style={{ maxWidth: "600px", textAlign: "center" }}>
          <p className="eyebrow" style={{ justifyContent: "center", marginBottom: "24px" }}>무료 도구</p>
          <h1 style={{ marginBottom: "16px" }}>웹훅 인스펙터</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "1.0625rem" }}>
            임시 웹훅 URL을 생성하고 들어오는 HTTP 요청을 실시간으로 확인하세요.
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: "96px" }}>
        <div className="container">
          {!endpoint ? (
            <div style={{ maxWidth: "480px", margin: "0 auto", textAlign: "center" }}>
              <div style={{ padding: "48px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", marginBottom: "24px" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-ash)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 20px" }}>
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <h2 style={{ marginBottom: "12px" }}>웹훅 URL 생성</h2>
                <p style={{ color: "var(--color-muted)", marginBottom: "28px", fontSize: "0.9375rem" }}>
                  버튼을 클릭하면 고유한 웹훅 URL이 생성됩니다.
                  해당 URL로 HTTP 요청을 보내면 아래에 실시간으로 표시됩니다.
                </p>
                <button onClick={createEndpoint} disabled={creating} className="btn btn-primary btn-pill btn-lg">
                  {creating ? "생성 중..." : "웹훅 URL 생성하기"}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
                {[
                  "생성된 URL은 7일 후 자동 만료됩니다",
                  "모든 HTTP 메서드를 수신합니다 (GET, POST, PUT, PATCH, DELETE)",
                  "요청 헤더, 바디, IP 주소를 확인할 수 있습니다",
                  "최대 100KB 바디를 저장합니다",
                ].map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.875rem", color: "var(--color-muted)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "24px", alignItems: "start" }}>
              {/* Left: endpoint + request list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "20px" }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-muted)", marginBottom: "12px" }}>웹훅 URL</p>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    <input
                      readOnly
                      value={endpoint.url}
                      className="input"
                      style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}
                    />
                    <button onClick={copyUrl} className="btn btn-primary" style={{ flexShrink: 0 }}>
                      {copied ? "복사됨" : "복사"}
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-success)", animation: "pulse 2s infinite" }} />
                    <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>실시간 수신 중 (2초마다 갱신)</span>
                  </div>
                </div>

                <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.9375rem" }}>수신된 요청</p>
                    <span className="badge">{requests.length}</span>
                  </div>
                  {requests.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem" }}>
                      아직 요청이 없습니다.<br />위 URL로 HTTP 요청을 보내보세요.
                    </div>
                  ) : (
                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                      {requests.map((req) => (
                        <button
                          key={req.id}
                          onClick={() => setSelected(req)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "12px 20px",
                            background: selected?.id === req.id ? "var(--color-surface-card)" : "transparent",
                            border: "none",
                            borderBottom: "1px solid var(--color-hairline)",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span style={{
                            fontSize: "0.6875rem", fontWeight: 700, padding: "2px 6px",
                            borderRadius: "var(--radius-sm)", color: "white",
                            background: METHOD_COLORS[req.method] || "#6b7280", flexShrink: 0,
                          }}>
                            {req.method}
                          </span>
                          <span style={{ flex: 1, fontSize: "0.8125rem", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.path || "/"}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", flexShrink: 0 }}>{formatTime(req.received_at)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: request detail */}
              <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden", minHeight: "400px" }}>
                {selected ? (
                  <div>
                    <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{
                        fontSize: "0.75rem", fontWeight: 700, padding: "3px 8px",
                        borderRadius: "var(--radius-sm)", color: "white",
                        background: METHOD_COLORS[selected.method] || "#6b7280",
                      }}>
                        {selected.method}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{selected.path || "/"}</span>
                      {selected.ip && <span style={{ marginLeft: "auto", fontSize: "0.8125rem", color: "var(--color-muted)" }}>IP: {selected.ip}</span>}
                    </div>

                    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                      <div>
                        <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-muted)", marginBottom: "10px" }}>헤더</p>
                        <div style={{ background: "var(--color-surface-dark)", borderRadius: "var(--radius-lg)", padding: "16px", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--color-canvas)", lineHeight: 1.6, overflowX: "auto" }}>
                          {Object.entries(selected.headers).map(([k, v]) => (
                            <div key={k}><span style={{ color: "#7dd3fc" }}>{k}</span>: {v}</div>
                          ))}
                        </div>
                      </div>

                      {selected.body && (
                        <div>
                          <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-muted)", marginBottom: "10px" }}>바디</p>
                          <pre style={{ background: "var(--color-surface-dark)", borderRadius: "var(--radius-lg)", padding: "16px", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--color-canvas)", lineHeight: 1.6, overflowX: "auto", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {tryParseJson(selected.body) || selected.body}
                          </pre>
                        </div>
                      )}

                      <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                        수신 시각: {new Date(selected.received_at).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px", color: "var(--color-muted)", textAlign: "center" }}>
                    <div>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", opacity: 0.4 }}>
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                        <path d="M3 9h18" />
                        <path d="M9 21V9" />
                      </svg>
                      <p style={{ fontSize: "0.9rem" }}>요청을 선택하면<br />상세 내용이 여기에 표시됩니다.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
