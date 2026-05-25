"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusIcon, LinkIcon, BarChartIcon, QrCodeIcon, EyeIcon, ExternalLinkIcon, CopyIcon, CheckIcon } from "@/components/icons";
import { formatNumber, formatRelativeTime, truncate, buildShortUrl } from "@/lib/utils";

interface LinkData {
  id: string;
  slug: string;
  original_url: string;
  title: string | null;
  click_count: number;
  unique_count: number;
  created_at: number;
  expires_at: number | null;
  is_active: number;
  password_hash: string | null;
}

interface DashboardStats {
  totalLinks: number;
  totalClicks: number;
  linksToday: number;
  topLink: LinkData | null;
}

function StatCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "var(--color-lifted)",
        border: "1px solid var(--color-hairline)",
        borderRadius: "var(--radius-xl)",
        padding: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", fontWeight: 500 }}>
          {label}
        </p>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-surface-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-ink)",
          }}
        >
          {icon}
        </div>
      </div>
      <p
        style={{
          fontSize: "2rem",
          fontWeight: 600,
          letterSpacing: "-0.03em",
          color: "var(--color-ink)",
          marginBottom: sub ? "4px" : 0,
        }}
      >
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {sub && <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{sub}</p>}
    </div>
  );
}

function LinkRow({ link, onCopy }: { link: LinkData; onCopy: (slug: string) => void }) {
  const shortUrl = buildShortUrl(link.slug);

  return (
    <tr>
      <td>
        <div>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "var(--color-ink)",
              marginBottom: "2px",
            }}
          >
            /{link.slug}
          </p>
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "280px",
            }}
          >
            {link.title ?? truncate(link.original_url, 50)}
          </p>
        </div>
      </td>
      <td>
        <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-ink)" }}>
          {formatNumber(link.click_count)}
        </span>
        {link.unique_count > 0 && (
          <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginLeft: "6px" }}>
            ({formatNumber(link.unique_count)} 순방문)
          </span>
        )}
      </td>
      <td style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
        {formatRelativeTime(link.created_at)}
      </td>
      <td>
        <span
          className={`badge ${link.is_active ? "badge-success" : "badge"}`}
          style={{ fontSize: "0.6875rem" }}
        >
          {link.is_active ? "활성" : "비활성"}
        </span>
      </td>
      <td>
        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
          <button
            onClick={() => onCopy(link.slug)}
            className="btn btn-ghost btn-sm btn-icon"
            title="단축 URL 복사"
          >
            <CopyIcon size={15} />
          </button>
          <a
            href={link.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm btn-icon"
            title="원본 URL 열기"
          >
            <ExternalLinkIcon size={15} />
          </a>
          <Link
            href={`/dashboard/links/${link.id}`}
            className="btn btn-ghost btn-sm btn-icon"
            title="분석 보기"
          >
            <BarChartIcon size={15} />
          </Link>
        </div>
      </td>
    </tr>
  );
}

export default function DashboardPage() {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalLinks: 0,
    totalClicks: 0,
    linksToday: 0,
    topLink: null,
  });
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/links?limit=10");
        if (res.ok) {
          const data = await res.json();
          setLinks(data.links ?? []);

          const totalClicks = (data.links ?? []).reduce(
            (sum: number, l: LinkData) => sum + (l.click_count ?? 0),
            0
          );
          const today = Date.now() - 24 * 60 * 60 * 1000;
          const linksToday = (data.links ?? []).filter(
            (l: LinkData) => l.created_at > today
          ).length;
          const topLink = (data.links ?? []).sort(
            (a: LinkData, b: LinkData) => b.click_count - a.click_count
          )[0] ?? null;

          setStats({
            totalLinks: data.total ?? 0,
            totalClicks,
            linksToday,
            topLink,
          });
        }
      } catch {
        console.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleCopy(slug: string) {
    const url = buildShortUrl(slug);
    await navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  return (
    <div style={{ padding: "32px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "32px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              marginBottom: "4px",
            }}
          >
            대시보드
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>
            링크 현황과 분석을 한눈에 확인하세요.
          </p>
        </div>

        <Link
          href="/dashboard/links/new"
          className="btn btn-primary btn-pill"
          style={{ textDecoration: "none", gap: "6px" }}
        >
          <PlusIcon size={16} />
          새 링크
        </Link>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        <StatCard
          label="총 링크"
          value={stats.totalLinks}
          icon={<LinkIcon size={18} />}
          sub="생성된 단축 링크"
        />
        <StatCard
          label="총 클릭"
          value={stats.totalClicks}
          icon={<BarChartIcon size={18} />}
          sub="전체 클릭 수"
        />
        <StatCard
          label="오늘 생성"
          value={stats.linksToday}
          icon={<PlusIcon size={18} />}
          sub="최근 24시간"
        />
        <StatCard
          label="인기 링크"
          value={stats.topLink ? `/${stats.topLink.slug}` : "—"}
          icon={<EyeIcon size={18} />}
          sub={
            stats.topLink
              ? `${formatNumber(stats.topLink.click_count)}회 클릭`
              : "링크를 만들어보세요"
          }
        />
      </div>

      {/* Quick create */}
      <div
        style={{
          background: "var(--color-ink)",
          borderRadius: "var(--radius-xl)",
          padding: "28px 32px",
          marginBottom: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "var(--color-canvas)",
              marginBottom: "4px",
              letterSpacing: "-0.02em",
            }}
          >
            지금 바로 링크를 단축하세요
          </p>
          <p style={{ fontSize: "0.875rem", color: "rgba(243,240,238,0.5)" }}>
            커스텀 슬러그, QR 코드, 분석까지 — 모두 포함
          </p>
        </div>
        <Link
          href="/dashboard/links/new"
          className="btn btn-pill"
          style={{
            textDecoration: "none",
            background: "var(--color-canvas)",
            color: "var(--color-ink)",
            border: "none",
            gap: "6px",
            flexShrink: 0,
          }}
        >
          <PlusIcon size={16} />
          새 링크 만들기
        </Link>
      </div>

      {/* Recent links */}
      <div
        style={{
          background: "var(--color-lifted)",
          border: "1px solid var(--color-hairline)",
          borderRadius: "var(--radius-xl)",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--color-hairline)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>최근 링크</h2>
          <Link
            href="/dashboard/links"
            style={{
              fontSize: "0.875rem",
              color: "var(--color-muted)",
              textDecoration: "none",
            }}
          >
            모두 보기
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--color-muted)" }}>
            로딩 중...
          </div>
        ) : links.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "var(--color-surface-card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "var(--color-muted)",
              }}
            >
              <LinkIcon size={22} />
            </div>
            <p style={{ fontWeight: 500, marginBottom: "8px" }}>아직 링크가 없습니다</p>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "20px" }}>
              첫 번째 단축 링크를 만들어보세요
            </p>
            <Link
              href="/dashboard/links/new"
              className="btn btn-primary btn-sm btn-pill"
              style={{ textDecoration: "none" }}
            >
              <PlusIcon size={15} />
              새 링크
            </Link>
          </div>
        ) : (
          <div style={{ overflow: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>링크</th>
                  <th>클릭</th>
                  <th>생성일</th>
                  <th>상태</th>
                  <th style={{ textAlign: "right" }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <LinkRow key={link.id} link={link} onCopy={handleCopy} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Copy toast */}
      {copiedSlug && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "var(--color-ink)",
            color: "var(--color-canvas)",
            padding: "10px 16px",
            borderRadius: "var(--radius-pill)",
            fontSize: "0.875rem",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "var(--shadow-card)",
            zIndex: 100,
            animation: "fade-up 0.2s ease",
          }}
        >
          <CheckIcon size={16} strokeWidth={2.5} />
          복사되었습니다
        </div>
      )}

      {/* Quick actions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          marginTop: "24px",
        }}
      >
        {[
          {
            href: "/dashboard/qr",
            icon: <QrCodeIcon size={22} />,
            title: "QR 코드 생성",
            desc: "SVG / PNG 다운로드",
          },
          {
            href: "/dashboard/analytics",
            icon: <BarChartIcon size={22} />,
            title: "분석 보기",
            desc: "국가, 디바이스별 통계",
          },
          {
            href: "/dashboard/api-keys",
            icon: <LinkIcon size={22} />,
            title: "API 키 관리",
            desc: "자동화 및 통합",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "20px",
              background: "var(--color-lifted)",
              border: "1px solid var(--color-hairline)",
              borderRadius: "var(--radius-xl)",
              textDecoration: "none",
              transition: "border-color 0.15s ease",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-surface-card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-ink)",
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--color-ink)" }}>
                {item.title}
              </p>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
