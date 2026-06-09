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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [linksRes, meRes, adminRes] = await Promise.all([
          fetch("/api/links?limit=5"),
          fetch("/api/auth/me"),
          fetch("/api/admin/check"),
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

        if (adminRes.ok) {
          const data = await adminRes.json();
          setIsAdmin(data.isAdmin);
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
    <div className="dash-home" style={{ padding: "32px" }}>
      <style>{`
        @media (max-width: 768px) {
          .dash-home { padding: 16px !important; }
          .dash-home-stats { grid-template-columns: repeat(3,1fr) !important; gap: 8px !important; }
          .dash-home-cta { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; padding: 20px 16px !important; }
          .dash-home-cta a { width: 100% !important; justify-content: center !important; }
          .dash-home-actions { grid-template-columns: repeat(2,1fr) !important; }
          .dash-toast { bottom: 80px !important; right: 16px !important; left: 16px !important; justify-content: center !important; }
        }
        @media (max-width: 480px) {
          .dash-home-stats { grid-template-columns: 1fr !important; }
        }
      `}</style>
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
      <div className="dash-home-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
        <StatCard label="총 링크" value={stats.totalLinks} icon={<LinkIcon size={18} />} sub="생성된 단축 링크" />
        <StatCard label="총 클릭" value={stats.totalClicks} icon={<BarChartIcon size={18} />} sub="전체 클릭 수" />
        <StatCard label="오늘 생성" value={stats.linksToday} icon={<PlusIcon size={18} />} sub="최근 24시간" />
      </div>

      {/* Quick create CTA */}
      <div className="dash-home-cta" style={{
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
      <div className="dash-home-actions" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
        {[
          { href: "/dashboard/blog", icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          ), title: "KRL Blog", desc: "slug.krl.kr 블로그" },
          { href: "/dashboard/drive", icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          ), title: "KRL Drive", desc: "파일 저장 · 공유" },
          { href: "/dashboard/hosting", icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" />
            </svg>
          ), title: "웹 호스팅", desc: "사이트 무료 배포" },
          { href: "/dashboard/ai", icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
            </svg>
          ), title: "AI 이미지", desc: "DALL-E 3 이미지 생성" },
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
          { href: "/dashboard/support", icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          ), title: "문의 채팅", desc: "관리자에게 문의" },
          { href: "/dashboard/badge", icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          ), title: "배지 생성기", desc: "GitHub README 배지" },
          { href: "/dashboard/og", icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M9 9h6M9 12h4"/>
            </svg>
          ), title: "OG 이미지", desc: "소셜 공유 썸네일" },
          { href: "/dashboard/signature", icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          ), title: "이메일 서명", desc: "HTML 서명 생성기" },
          { href: "/dashboard/fonts", icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          ), title: "폰트 CDN", desc: "무료 웹폰트 CDN" },
          ...(isAdmin ? [{ href: "/dashboard/admin", icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          ), title: "관리자", desc: "사이트 관리 패널" }] : []),
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
        <div className="dash-toast" style={{
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
