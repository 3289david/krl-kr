"use client";
import { useState, useEffect } from "react";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "outage";
  latency_ms?: number;
}

interface StatusData {
  status: "operational" | "degraded" | "outage";
  services: ServiceStatus[];
  uptime: string;
  checked_at: string;
}

const STATUS_LABELS = {
  operational: "정상",
  degraded: "성능 저하",
  outage: "장애",
};

const STATUS_COLORS = {
  operational: "var(--color-success)",
  degraded: "var(--color-warning)",
  outage: "var(--color-danger)",
};

function StatusDot({ status }: { status: "operational" | "degraded" | "outage" }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <circle cx="5" cy="5" r="5" fill={STATUS_COLORS[status]} />
    </svg>
  );
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string>("");

  async function fetchStatus() {
    try {
      const res = await fetch("/api/v1/status");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastChecked(new Date().toLocaleTimeString("ko-KR"));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main>
      <section className="section">
        <div className="container" style={{ maxWidth: "720px" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <p className="eyebrow" style={{ justifyContent: "center", marginBottom: "24px" }}>서비스 상태</p>
            <h1 style={{ marginBottom: "20px" }}>시스템 현황</h1>
            {data && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "12px 24px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-pill)" }}>
                <StatusDot status={data.status} />
                <span style={{ fontWeight: 600, color: STATUS_COLORS[data.status] }}>
                  {STATUS_LABELS[data.status]}
                </span>
                <span style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>— 업타임 {data.uptime}</span>
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "48px", color: "var(--color-muted)" }}>상태 확인 중...</div>
          ) : data ? (
            <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>서비스 구성요소</h3>
                <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                  마지막 확인: {lastChecked}
                </span>
              </div>
              {data.services.map((service, i) => (
                <div key={service.name} style={{
                  padding: "18px 24px",
                  borderBottom: i < data.services.length - 1 ? "1px solid var(--color-hairline)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <StatusDot status={service.status} />
                    <span style={{ fontWeight: 500, fontSize: "0.9375rem" }}>{service.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    {service.latency_ms !== undefined && (
                      <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}>
                        {service.latency_ms}ms
                      </span>
                    )}
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: STATUS_COLORS[service.status] }}>
                      {STATUS_LABELS[service.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "48px", color: "var(--color-danger)" }}>상태 정보를 불러올 수 없습니다.</div>
          )}

          {/* Uptime history (static for now) */}
          <div style={{ marginTop: "24px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>과거 90일 업타임</h3>
            <div style={{ display: "flex", gap: "3px", marginBottom: "8px" }}>
              {Array.from({ length: 90 }).map((_, i) => (
                <div
                  key={i}
                  title={`${90 - i}일 전`}
                  style={{
                    flex: 1, height: "32px",
                    background: i % 30 === 15 ? "var(--color-warning)" : "var(--color-success)",
                    borderRadius: "2px", opacity: 0.7 + (i / 90) * 0.3,
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-muted)" }}>
              <span>90일 전</span>
              <span>오늘</span>
            </div>
          </div>

          <p style={{ textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem", marginTop: "32px" }}>
            문제가 있으신가요?{" "}
            <a href="mailto:contact@rukkit.net" style={{ color: "var(--color-ink)" }}>contact@rukkit.net</a>로 문의해주세요.
          </p>
        </div>
      </section>
    </main>
  );
}
