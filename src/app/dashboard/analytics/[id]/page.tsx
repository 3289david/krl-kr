"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { BarChartIcon } from "@/components/icons";
import { formatNumber, getCountryName } from "@/lib/utils";

interface StatsData {
  total: number;
  unique: number;
  byDay: Array<{ date: string; count: number }>;
  byCountry: Array<{ country: string; count: number }>;
  byDevice: Array<{ device_type: string; count: number }>;
  byBrowser: Array<{ browser: string; count: number }>;
  byReferer: Array<{ referer_domain: string; count: number }>;
}

function BarChart({ data, labelKey, valueKey }: {
  data: Array<Record<string, unknown>>;
  labelKey: string;
  valueKey: string;
}) {
  if (!data.length) return <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>데이터가 없습니다.</p>;
  const max = Math.max(...data.map((d) => d[valueKey] as number));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {data.map((row, i) => {
        const value = row[valueKey] as number;
        const pct = max > 0 ? (value / max) * 100 : 0;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "120px", fontSize: "0.8125rem", color: "var(--color-body)", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {labelKey === "country" ? getCountryName(row[labelKey] as string) : String(row[labelKey])}
            </div>
            <div style={{ flex: 1, height: "8px", background: "var(--color-surface-card)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
              <div style={{
                width: `${pct}%`, height: "100%",
                background: "var(--color-ink)", borderRadius: "var(--radius-pill)",
                transition: "width 0.5s ease",
              }} />
            </div>
            <div style={{ width: "48px", textAlign: "right", fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-ink)", flexShrink: 0 }}>
              {formatNumber(value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (!data.length) return <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>데이터가 없습니다.</p>;
  const max = Math.max(...data.map((d) => d.count));

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "120px", overflowX: "auto", paddingBottom: "8px" }}>
      {data.map((row, i) => {
        const pct = max > 0 ? (row.count / max) * 100 : 0;
        return (
          <div key={i} title={`${row.date}: ${row.count}회`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", minWidth: "20px", flex: 1 }}>
            <div style={{
              width: "100%", minWidth: "8px",
              height: `${Math.max(2, pct)}%`,
              background: pct > 50 ? "var(--color-ink)" : "var(--color-surface-card)",
              borderRadius: "var(--radius-xs) var(--radius-xs) 0 0",
              transition: "height 0.3s ease",
              border: "1px solid var(--color-hairline)",
            }} />
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/links/${id}/stats?days=${days}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else if (res.status === 404) {
          setError("링크를 찾을 수 없습니다.");
        } else {
          setError("통계를 불러오지 못했습니다.");
        }
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [id, days]);

  if (error) {
    return (
      <div style={{ padding: "32px", textAlign: "center" }}>
        <p style={{ color: "var(--color-danger)" }}>{error}</p>
        <Link href="/dashboard/links" style={{ color: "var(--color-ink)" }}>링크 목록으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <Link href="/dashboard/links" style={{ color: "var(--color-muted)", textDecoration: "none", fontSize: "0.875rem" }}>
          링크 관리
        </Link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-ash)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        <span style={{ fontSize: "0.875rem", color: "var(--color-ink)" }}>분석</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "4px" }}>
            클릭 분석
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>링크 ID: {id}</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`btn btn-sm btn-pill ${days === d ? "btn-primary" : "btn-secondary"}`}
            >
              {d}일
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "64px", color: "var(--color-muted)" }}>로딩 중...</div>
      ) : stats ? (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
            {[
              { label: "총 클릭", value: stats.total, icon: <BarChartIcon size={18} /> },
              { label: "순방문자", value: stats.unique, icon: <BarChartIcon size={18} /> },
              { label: "평균 일일 클릭", value: days > 0 ? Math.round(stats.total / days) : 0, icon: <BarChartIcon size={18} /> },
            ].map((card) => (
              <div key={card.label} style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px" }}>
                <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "12px" }}>{card.label}</p>
                <p style={{ fontSize: "2rem", fontWeight: 600, letterSpacing: "-0.03em" }}>{formatNumber(card.value)}</p>
              </div>
            ))}
          </div>

          {/* Day chart */}
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>일별 클릭 수 (최근 {days}일)</h3>
            <DayChart data={stats.byDay} />
          </div>

          {/* Grid: country + device */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>국가별</h3>
              <BarChart data={stats.byCountry} labelKey="country" valueKey="count" />
            </div>
            <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>기기별</h3>
              <BarChart data={stats.byDevice} labelKey="device_type" valueKey="count" />
            </div>
          </div>

          {/* Grid: browser + referer */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>브라우저별</h3>
              <BarChart data={stats.byBrowser} labelKey="browser" valueKey="count" />
            </div>
            <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>유입 경로</h3>
              <BarChart data={stats.byReferer} labelKey="referer_domain" valueKey="count" />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
