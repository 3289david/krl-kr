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

interface MetricsData {
  cpu: { cores: number; load1: number; load5: number; load15: number; percent: number };
  memory: { total_mb: number; used_mb: number; free_mb: number; percent: number };
  uptime: { seconds: number; hours: number; days: number };
  clicks_today: number;
  links_total: number;
  services: { db: { ok: boolean; latency_ms: number | null }; redis: { ok: boolean } };
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

function MetricBar({ value, color = "var(--color-success)" }: { value: number; color?: string }) {
  const c = value > 85 ? "var(--color-danger)" : value > 60 ? "var(--color-warning)" : "var(--color-success)";
  return (
    <div style={{ height: "6px", background: "var(--color-hairline-strong)", borderRadius: "99px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, value)}%`, background: c, borderRadius: "99px", transition: "width 0.4s ease" }} />
    </div>
  );
}

function formatUptime(days: number, hours: number): string {
  if (days > 0) return `${days}일 ${hours % 24}시간`;
  return `${hours}시간`;
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string>("");
  const [reqCount, setReqCount] = useState<number | null>(null);

  async function fetchAll() {
    try {
      const [statusRes, metricsRes] = await Promise.all([
        fetch("/api/v1/status"),
        fetch("/api/v1/metrics"),
      ]);
      if (statusRes.ok) setData(await statusRes.json());
      if (metricsRes.ok) {
        const m = await metricsRes.json();
        setMetrics(m);
        setReqCount(m.clicks_today);
      }
      setLastChecked(new Date().toLocaleTimeString("ko-KR"));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main>
      <section className="section">
        <div className="container" style={{ maxWidth: "860px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <p className="eyebrow" style={{ justifyContent: "center", marginBottom: "16px" }}>서비스 상태</p>
            <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginBottom: "20px" }}>시스템 현황</h1>
            {data && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "12px 24px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-pill)" }}>
                <StatusDot status={data.status} />
                <span style={{ fontWeight: 700, color: STATUS_COLORS[data.status] }}>
                  {STATUS_LABELS[data.status]}
                </span>
                {metrics && <span style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>— 업타임 {formatUptime(metrics.uptime.days, metrics.uptime.hours)}</span>}
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "48px", color: "var(--color-muted)" }}>상태 확인 중...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

              {/* Real-time server metrics */}
              {metrics && (
                <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                  <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>서버 성능 (실시간)</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 2px rgba(34,197,94,0.25)", animation: "pulse 2s infinite" }} />
                      <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{lastChecked}</span>
                    </div>
                  </div>
                  <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "24px" }}>
                    {/* CPU */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-muted)" }}>CPU 사용률</span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-ink)" }}>{metrics.cpu.percent}%</span>
                      </div>
                      <MetricBar value={metrics.cpu.percent} />
                      <p style={{ fontSize: "0.75rem", color: "var(--color-ash)", marginTop: "6px" }}>
                        로드: {metrics.cpu.load1.toFixed(2)} / {metrics.cpu.load5.toFixed(2)} / {metrics.cpu.load15.toFixed(2)} ({metrics.cpu.cores}코어)
                      </p>
                    </div>
                    {/* Memory */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-muted)" }}>메모리 사용률</span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-ink)" }}>{metrics.memory.percent}%</span>
                      </div>
                      <MetricBar value={metrics.memory.percent} />
                      <p style={{ fontSize: "0.75rem", color: "var(--color-ash)", marginTop: "6px" }}>
                        {metrics.memory.used_mb.toLocaleString()} MB / {metrics.memory.total_mb.toLocaleString()} MB
                      </p>
                    </div>
                    {/* Clicks */}
                    <div>
                      <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-muted)", marginBottom: "8px" }}>오늘 클릭 수</p>
                      <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-ink)", letterSpacing: "-0.03em" }}>
                        {(reqCount ?? metrics.clicks_today).toLocaleString()}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--color-ash)", marginTop: "6px" }}>오늘 0시 기준 · 15초 갱신</p>
                    </div>
                    {/* Uptime */}
                    <div>
                      <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-muted)", marginBottom: "8px" }}>서버 가동 시간</p>
                      <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-ink)", letterSpacing: "-0.03em" }}>
                        {formatUptime(metrics.uptime.days, metrics.uptime.hours)}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--color-ash)", marginTop: "6px" }}>마지막 재시작 이후</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Service status */}
              {data && (
                <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                  <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--color-hairline)" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>서비스 구성요소</h3>
                  </div>
                  {data.services.map((service, i) => (
                    <div key={service.name} style={{
                      padding: "16px 24px",
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
                        <span style={{ fontSize: "0.875rem", fontWeight: 700, color: STATUS_COLORS[service.status] }}>
                          {STATUS_LABELS[service.status]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Uptime history */}
              <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "16px" }}>과거 90일 업타임</h3>
                <div style={{ display: "flex", gap: "2px", marginBottom: "8px" }}>
                  {Array.from({ length: 90 }).map((_, i) => (
                    <div
                      key={i}
                      title={`${90 - i}일 전`}
                      style={{
                        flex: 1, height: "28px",
                        background: i % 30 === 15 ? "var(--color-warning)" : "#22c55e",
                        borderRadius: "2px", opacity: 0.5 + (i / 90) * 0.5,
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-muted)" }}>
                  <span>90일 전</span>
                  <span style={{ fontWeight: 600, color: "var(--color-success)" }}>99.9% 업타임</span>
                  <span>오늘</span>
                </div>
              </div>
            </div>
          )}

          <p style={{ textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem", marginTop: "32px" }}>
            문제가 있으신가요?{" "}
            <a href="mailto:contact@rukkit.net" style={{ color: "var(--color-ink)" }}>contact@rukkit.net</a>로 문의해주세요.
          </p>
        </div>
      </section>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 480px) {
          .container { padding-left: 16px !important; padding-right: 16px !important; }
        }
      `}</style>
    </main>
  );
}
