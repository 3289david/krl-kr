"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  PlusIcon, LinkIcon, BarChartIcon, QrCodeIcon, EyeIcon,
  ExternalLinkIcon, CopyIcon, CheckIcon, FileIcon, CodeIcon,
  WebhookIcon, KeyIcon
} from "@/components/icons";
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

function StatCard({ label, value, icon, sub }: {
  label: string; value: string | number; icon: React.ReactNode; sub?: string;
}) {
  return (
    <div style={{
      background: "var(--color-lifted)",
      border: "1px solid var(--color-hairline)",
      borderRadius: "var(--radius-xl)",
      padding: "24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", fontWeight: 500 }}>{label}</p>
        <div style={{
          width: "36px", height: "36px", borderRadius: "var(--radius-sm)",
          background: "var(--color-surface-card)", display: "flex",
          alignItems: "center", justifyContent: "center", color: "var(--color-ink)",
        }}>{icon}</div>
      </div>
      <p style={{ fontSize: "2rem", fontWeight: 600, letterSpacing: "-0.03em", color: "var(--color-ink)", marginBottom: sub ? "4px" : 0 }}>
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {sub && <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [stats, setStats] = useState({ totalLinks: 0, totalClicks: 0, linksToday: 0 });
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [user, setUser] = useState<{ name: string | null; email: string; plan: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [linksRes, meRes] = await Promise.all([
          fetch("/api/links?limit=5"),
          fetch("/api/auth/me"),
        ]);

        if (linksRes.ok) {
          const data = await linksRes.json();
          const linkList: LinkData[] = data.links ?? [];
          setLinks(linkList);
          const totalClicks = linkList.reduce((sum, l) => sum + (l.click_count ?? 0), 0);
          const today = Date.now() - 24 * 60 * 60 * 1000;
          setStats({
            totalLinks: data.total ?? 0,
            totalClicks,
            linksToday: linkList.filter((l) => l.created_at > today).length,
          });
        }

        if (meRes.ok) {
          const data = await meRes.json();
          setUser(data.user);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleCopy(slug: string) {
    await navigator.clipboard.writeText(buildShortUrl(slug));
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  return (
    <div style={{ padding: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "4px" }}>
            {user?.name ? `${user.name}님의 링크` : "내 링크 현황"}
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>
            단축한 링크와 클릭 수를 확인하세요.
          </p>
        </div>
        <Link href="/dashboard/links" className="btn btn-primary btn-pill" style={{ textDecoration: "none", gap: "6px" }}>
          <PlusIcon size={16} />
          새 링크
        </Link>
      </div>

      {/* Stats grid */}
      <div className="dashboard-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
        <StatCard label="총 링크" value={stats.totalLinks} icon={<LinkIcon size={18} />} sub="생성된 단축 링크" />
        <StatCard label="총 클릭" value={stats.totalClicks} icon={<BarChartIcon size={18} />} sub="전체 클릭 수" />
        <StatCard label="오늘 생성" value={stats.linksToday} icon={<PlusIcon size={18} />} sub="최근 24시간" />
      </div>

      {/* Quick create CTA */}
      <div style={{
        background: "var(--color-ink)", borderRadius: "var(--radius-xl)", padding: "28px 32px",
        marginBottom: "32px", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: "24px", flexWrap: "wrap",
      }}>
        <div>
          <p style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--color-canvas)", marginBottom: "4px", letterSpacing: "-0.02em" }}>
            지금 바로 링크를 단축하세요
          </p>
          <p style={{ fontSize: "0.875rem", color: "rgba(243,240,238,0.5)" }}>
            짧은 주소, 클릭 통계, QR 코드를 바로 사용할 수 있어요
          </p>
        </div>
        <Link href="/dashboard/links" className="btn btn-pill" style={{
          textDecoration: "none", background: "var(--color-canvas)",
          color: "var(--color-ink)", border: "none", gap: "6px", flexShrink: 0,
        }}>
          <PlusIcon size={16} />
          새 링크 만들기
        </Link>
      </div>

      {/* Recent links */}
      <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", marginBottom: "24px" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--color-hairline)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>최근 링크</h2>
          <Link href="/dashboard/links" style={{ fontSize: "0.875rem", color: "var(--color-muted)", textDecoration: "none" }}>
            모두 보기
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--color-muted)" }}>로딩 중...</div>
        ) : links.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "50%", background: "var(--color-surface-card)",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--color-muted)",
            }}>
              <LinkIcon size={22} />
            </div>
            <p style={{ fontWeight: 500, marginBottom: "8px" }}>아직 링크가 없습니다</p>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "20px" }}>첫 번째 단축 링크를 만들어보세요</p>
            <Link href="/dashboard/links" className="btn btn-primary btn-sm btn-pill" style={{ textDecoration: "none" }}>
              <PlusIcon size={15} />새 링크
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
                  <th style={{ textAlign: "right" }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id}>
                    <td>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", fontWeight: 600, color: "var(--color-ink)", marginBottom: "2px" }}>
                        /{link.slug}
                      </p>
                      <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {link.title ?? truncate(link.original_url, 50)}
                      </p>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{formatNumber(link.click_count)}</span>
                    </td>
                    <td style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                      {formatRelativeTime(link.created_at)}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button onClick={() => handleCopy(link.slug)} className="btn btn-ghost btn-sm btn-icon" title="복사">
                          {copiedSlug === link.slug ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
                        </button>
                        <a href={link.original_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm btn-icon">
                          <ExternalLinkIcon size={15} />
                        </a>
                        <Link href={`/dashboard/analytics/${link.id}`} className="btn btn-ghost btn-sm btn-icon">
                          <BarChartIcon size={15} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="dashboard-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
        {[
          { href: "/dashboard/qr", icon: <QrCodeIcon size={20} />, title: "QR 코드", desc: "SVG/PNG 생성" },
          { href: "/dashboard/files", icon: <FileIcon size={20} />, title: "파일 공유", desc: "드래그앤드롭 업로드" },
          { href: "/dashboard/paste", icon: <CodeIcon size={20} />, title: "Pastebin", desc: "코드 공유" },
          { href: "/dashboard/webhook", icon: <WebhookIcon size={20} />, title: "웹훅 검사", desc: "요청 모니터링" },
          { href: "/dashboard/api-keys", icon: <KeyIcon size={20} />, title: "API 키", desc: "REST API 키 관리" },
          { href: "/docs", icon: <CodeIcon size={20} />, title: "API 문서", desc: "REST API 레퍼런스" },
          { href: "/search", icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          ), title: "검색", desc: "개인정보 수집 없는 검색" },
        ].map((item) => (
          <Link key={item.href} href={item.href} style={{
            display: "flex", alignItems: "center", gap: "12px", padding: "16px",
            background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
            borderRadius: "var(--radius-lg)", textDecoration: "none", transition: "border-color 0.15s",
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "var(--radius-sm)",
              background: "var(--color-surface-card)", display: "flex",
              alignItems: "center", justifyContent: "center", color: "var(--color-ink)", flexShrink: 0,
            }}>{item.icon}</div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-ink)" }}>{item.title}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {copiedSlug && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px",
          background: "var(--color-ink)", color: "var(--color-canvas)",
          padding: "10px 16px", borderRadius: "var(--radius-pill)",
          fontSize: "0.875rem", fontWeight: 500, display: "flex",
          alignItems: "center", gap: "8px", boxShadow: "var(--shadow-card)",
          zIndex: 100,
        }}>
          <CheckIcon size={16} strokeWidth={2.5} />
          복사되었습니다
        </div>
      )}
    </div>
  );
}
