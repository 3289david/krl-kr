"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

function StatCard({ label, value, icon, color = "var(--color-ink)" }: {
  label: string; value: string | number; icon: string; color?: string;
}) {
  return (
    <div style={{
      background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
      borderRadius: "var(--radius-xl)", padding: "20px 24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "var(--radius-sm)",
          background: color === "var(--color-ink)" ? "var(--color-surface-card)" : color + "15",
          display: "flex", alignItems: "center", justifyContent: "center",
          color,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            {icon.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
          </svg>
        </div>
        <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)", fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--color-ink)" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<{
    userCount: number; linkCount: number; adminCount: number;
    noticeCount: number; unreadChat: number; openMeetings: number;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { getPool } = await fetch("/api/admin/check").then(() => ({ getPool: null }));
        void getPool;

        const [usersRes, adminsRes, noticesRes, meetingsRes] = await Promise.all([
          fetch("/api/admin/users?limit=1"),
          fetch("/api/admin/admins"),
          fetch("/api/admin/notices"),
          fetch("/api/admin/meetings"),
        ]);

        const [usersData, adminsData, noticesData, meetingsData] = await Promise.all([
          usersRes.ok ? usersRes.json() : { total: 0 },
          adminsRes.ok ? adminsRes.json() : { admins: [] },
          noticesRes.ok ? noticesRes.json() : { notices: [] },
          meetingsRes.ok ? meetingsRes.json() : { meetings: [] },
        ]);

        setStats({
          userCount: usersData.total ?? 0,
          linkCount: 0,
          adminCount: (adminsData.admins ?? []).length,
          noticeCount: (noticesData.notices ?? []).filter((n: { visible: number }) => n.visible).length,
          unreadChat: 0,
          openMeetings: (meetingsData.meetings ?? []).filter((m: { status: string }) => m.status === "open").length,
        });
      } catch {
        // ignore
      }
    }
    load();
  }, []);

  const quickLinks = [
    { href: "/dashboard/admin/users", label: "사용자 관리", desc: "차단, 검색, 정보 조회", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
    { href: "/dashboard/admin/notices", label: "공지 작성", desc: "팝업 공지, 고정 공지", icon: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" },
    { href: "/dashboard/admin/chat", label: "지원 채팅", desc: "사용자 문의 응답", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
    { href: "/dashboard/admin/meetings", label: "관리자 회의", desc: "내부 회의 채팅방", icon: "M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" },
  ];

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "4px" }}>
          관리자 대시보드
        </h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>
          KRL.KR 사이트 전체 관리 패널
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <StatCard label="전체 사용자" value={stats?.userCount ?? "—"} icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        <StatCard label="관리자 수" value={stats?.adminCount ?? "—"} icon="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" color="#7C3AED" />
        <StatCard label="활성 공지" value={stats?.noticeCount ?? "—"} icon="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" color="#059669" />
        <StatCard label="진행 중 회의" value={stats?.openMeetings ?? "—"} icon="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" color="#D97706" />
      </div>

      {/* Quick actions */}
      <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>빠른 관리</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
        {quickLinks.map((item) => (
          <Link key={item.href} href={item.href} style={{
            display: "flex", alignItems: "center", gap: "12px", padding: "16px",
            background: "var(--color-lifted)", border: "1px solid var(--color-hairline)",
            borderRadius: "var(--radius-lg)", textDecoration: "none",
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "var(--radius-sm)",
              background: "var(--color-surface-card)", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                {item.icon.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
              </svg>
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-ink)" }}>{item.label}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
