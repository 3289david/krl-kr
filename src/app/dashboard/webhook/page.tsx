"use client";
import { useState, useEffect, useRef } from "react";
import { PlusIcon, CopyIcon, CheckIcon, RefreshIcon, TrashIcon } from "@/components/icons";

interface WebhookEndpoint {
  id: string;
  slug: string;
  label: string | null;
  expires_at: string | null;
  request_count: number;
  url: string;
}

interface WebhookRequest {
  id: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  query: string | null;
  ip: string | null;
  received_at: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "#1a5abd", POST: "#1a7f4b", PUT: "#b85c00",
  PATCH: "#8b5cf6", DELETE: "#c0001a",
};

export default function WebhookPage() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [activeEndpoint, setActiveEndpoint] = useState<WebhookEndpoint | null>(null);
  const [requests, setRequests] = useState<WebhookRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<WebhookRequest | null>(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/v1/webhook")
      .then((r) => r.json())
      .then((d) => {
        const eps: WebhookEndpoint[] = (d.endpoints ?? []).map((e: Record<string, unknown>) => ({
          ...e,
          expires_at: e.expires_at ? new Date(Number(e.expires_at)).toISOString() : null,
          url: `https://krl.kr/api/v1/webhook/${e.slug}`,
        }));
        setEndpoints(eps);
        if (eps.length > 0) setActiveEndpoint(eps[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeEndpoint) return;
    pollRequests(activeEndpoint.slug);
    pollRef.current = setInterval(() => pollRequests(activeEndpoint.slug), 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEndpoint]);

  async function pollRequests(slug: string) {
    try {
      const res = await fetch(`/api/v1/webhook/${slug}?inspect=1`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests ?? []);
      }
    } catch {}
  }

  async function createEndpoint() {
    setCreating(true);
    try {
      const res = await fetch("/api/v1/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        const endpoint = { ...data, url: data.url ?? `https://krl.kr/api/v1/webhook/${data.slug}` };
        setEndpoints((prev) => [endpoint, ...prev]);
        setActiveEndpoint(endpoint);
        setLabel("");
      }
    } catch {}
    setCreating(false);
  }

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  async function deleteEndpoint(slug: string) {
    try {
      const res = await fetch(`/api/v1/webhook/${slug}?manage=1`, { method: "DELETE" });
      if (res.ok) {
        setEndpoints((prev) => prev.filter((e) => e.slug !== slug));
        if (activeEndpoint?.slug === slug) setActiveEndpoint(null);
      }
    } catch {}
  }

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "4px" }}>웹훅 인스펙터</h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>실시간으로 들어오는 HTTP 요청을 모니터링하세요.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "24px" }} className="webhook-layout">
        {/* Sidebar */}
        <div>
          {/* Create */}
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "20px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "12px" }}>새 엔드포인트</h3>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="레이블 (선택)" className="input" style={{ fontSize: "0.875rem", marginBottom: "10px" }} />
            <button onClick={createEndpoint} disabled={creating} className="btn btn-primary btn-pill" style={{ width: "100%", justifyContent: "center", gap: "6px" }}>
              <PlusIcon size={14} />{creating ? "생성 중..." : "엔드포인트 만들기"}
            </button>
          </div>

          {/* Endpoint list */}
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-hairline)" }}>
              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-muted)" }}>엔드포인트 ({endpoints.length})</p>
            </div>
            {loading ? (
              <p style={{ padding: "20px", textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem" }}>로딩 중...</p>
            ) : endpoints.length === 0 ? (
              <p style={{ padding: "20px", textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem" }}>아직 엔드포인트가 없습니다</p>
            ) : (
              endpoints.map((ep) => (
                <div
                  key={ep.id}
                  onClick={() => setActiveEndpoint(ep)}
                  style={{
                    padding: "12px 16px", cursor: "pointer",
                    background: activeEndpoint?.id === ep.id ? "var(--color-surface-card)" : "transparent",
                    borderBottom: "1px solid var(--color-hairline)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-ink)" }}>
                      {ep.slug}
                    </p>
                    <button onClick={(e) => { e.stopPropagation(); deleteEndpoint(ep.slug); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "2px" }}>
                      <TrashIcon size={13} />
                    </button>
                  </div>
                  {ep.label && <p style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{ep.label}</p>}
                  <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "2px" }}>
                    {ep.request_count}개 요청
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main content */}
        <div>
          {activeEndpoint ? (
            <>
              {/* Endpoint URL */}
              <div style={{ background: "var(--color-ink)", borderRadius: "var(--radius-xl)", padding: "20px 24px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "0.75rem", color: "rgba(243,240,238,0.5)", marginBottom: "4px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>웹훅 URL</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--color-canvas)" }}>
                    {activeEndpoint.url}
                  </p>
                </div>
                <button onClick={() => handleCopy(activeEndpoint.url)} className="btn btn-sm btn-pill" style={{ background: "rgba(255,255,255,0.1)", color: "var(--color-canvas)", border: "none", gap: "6px", flexShrink: 0 }}>
                  {copiedUrl ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                  {copiedUrl ? "복사됨" : "복사"}
                </button>
              </div>

              {/* Requests */}
              <div style={{ display: "grid", gridTemplateColumns: selectedRequest ? "1fr 1fr" : "1fr", gap: "16px" }}>
                <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>수신 요청</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-success)", display: "inline-block" }} />
                      <span style={{ fontSize: "0.75rem", color: "var(--color-success)" }}>실시간</span>
                      <button onClick={() => pollRequests(activeEndpoint.slug)} className="btn btn-ghost btn-sm btn-icon">
                        <RefreshIcon size={14} />
                      </button>
                    </div>
                  </div>
                  {requests.length === 0 ? (
                    <div style={{ padding: "48px", textAlign: "center" }}>
                      <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>아직 요청이 없습니다</p>
                      <p style={{ color: "var(--color-ash)", fontSize: "0.8125rem", marginTop: "8px" }}>위 URL로 HTTP 요청을 보내보세요</p>
                    </div>
                  ) : (
                    <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                      {requests.map((req) => (
                        <div
                          key={req.id}
                          onClick={() => setSelectedRequest(req.id === selectedRequest?.id ? null : req)}
                          style={{
                            padding: "12px 20px",
                            borderBottom: "1px solid var(--color-hairline)",
                            cursor: "pointer",
                            background: selectedRequest?.id === req.id ? "var(--color-surface-card)" : "transparent",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span style={{
                              padding: "2px 8px", borderRadius: "var(--radius-xs)", fontSize: "0.6875rem", fontWeight: 700,
                              fontFamily: "var(--font-mono)", background: `${METHOD_COLORS[req.method] ?? "#666"}18`,
                              color: METHOD_COLORS[req.method] ?? "#666",
                            }}>{req.method}</span>
                            <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                              {new Date(req.received_at).toLocaleTimeString("ko-KR")}
                            </span>
                          </div>
                          {req.ip && <p style={{ fontSize: "0.75rem", color: "var(--color-ash)" }}>IP: {req.ip}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Request detail */}
                {selectedRequest && (
                  <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>요청 상세</p>
                      <button onClick={() => setSelectedRequest(null)} className="btn btn-ghost btn-icon"><TrashIcon size={14} /></button>
                    </div>
                    <div style={{ padding: "20px", overflowY: "auto", maxHeight: "500px" }}>
                      <div style={{ marginBottom: "16px" }}>
                        <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: "8px" }}>헤더</p>
                        <pre style={{
                          background: "var(--color-surface-dark)", color: "var(--color-canvas)",
                          borderRadius: "var(--radius-sm)", padding: "12px", fontSize: "0.75rem",
                          overflow: "auto", whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)",
                        }}>
                          {JSON.stringify(selectedRequest.headers, null, 2)}
                        </pre>
                      </div>
                      {selectedRequest.body && (
                        <div>
                          <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: "8px" }}>본문</p>
                          <pre style={{
                            background: "var(--color-surface-dark)", color: "var(--color-canvas)",
                            borderRadius: "var(--radius-sm)", padding: "12px", fontSize: "0.75rem",
                            overflow: "auto", whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)",
                          }}>
                            {(() => { try { return JSON.stringify(JSON.parse(selectedRequest.body!), null, 2); } catch { return selectedRequest.body; } })()}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "64px", textAlign: "center" }}>
              <p style={{ fontWeight: 500, marginBottom: "8px" }}>엔드포인트를 선택하거나 새로 만드세요</p>
              <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>실시간 HTTP 요청을 모니터링할 수 있습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
