"use client";
import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItemConfig {
  id: string;
  href: string;
  label: string;
  desc?: string;
  icon?: string;
  icon2?: string;
  visible: boolean;
}

interface NavMenuConfig {
  id: string;
  label: string;
  visible: boolean;
  items: NavItemConfig[];
}

interface SimpleLinkConfig {
  id: string;
  href: string;
  label: string;
  icon?: string;
  visible: boolean;
}

interface HeaderConfig {
  logo: { text: string; href: string };
  navMenus: NavMenuConfig[];
  simpleLinks: SimpleLinkConfig[];
  rightButtons: {
    search: { visible: boolean; href: string };
    report: { visible: boolean };
    donate: { visible: boolean; href: string; label: string };
  };
}

// ─── Default Config ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG: HeaderConfig = {
  logo: { text: "KRL.KR", href: "/" },
  navMenus: [
    {
      id: "links-qr", label: "링크 · QR", visible: true,
      items: [
        { id: "url-shortener", href: "/", label: "URL 단축기", desc: "krl.kr/abc 형태의 짧은 주소", icon: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", icon2: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71", visible: true },
        { id: "qr-code", href: "/qr", label: "QR 코드", desc: "SVG·PNG 다운로드, 로고 삽입", icon: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h4 M18 14v4 M14 18h4 M18 18v4", visible: true },
        { id: "dynamic-link", href: "/dashboard/links?tab=dynamic", label: "다이나믹 링크", desc: "QR 유지하면서 목적지 변경", icon: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4", visible: true },
        { id: "temp-link", href: "/dashboard/links?tab=temp", label: "임시 링크", desc: "시간·클릭 후 자동 만료", icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2", visible: true },
        { id: "app-link", href: "/dashboard/links?tab=app", label: "앱 링크", desc: "iOS/Android별 주소 분기", icon: "M12 18h.01 M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z", visible: true },
      ],
    },
    {
      id: "files-share", label: "파일 · 공유", visible: true,
      items: [
        { id: "file-share", href: "/tools/drop", label: "파일 공유", desc: "업로드 후 링크로 공유", icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12", visible: true },
        { id: "paste", href: "/tools/paste", label: "코드·텍스트 공유", desc: "붙여넣고 링크로 공유", icon: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z", visible: true },
        { id: "email", href: "/dashboard/email", label: "이메일 수신함", desc: "이름@krl.kr로 메일 수신", icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6", visible: true },
        { id: "webhook", href: "/tools/webhook", label: "웹훅 테스트", desc: "요청 실시간 확인", icon: "M18 16.98h-5.99c-1.1 0-1.95.68-2.23 1.61A3 3 0 0 1 2 17c0-1.66 1.34-3 3-3h.5 M12 3C9.24 3 7 5.24 7 8c0 2.16 1.28 3.99 3.12 4.82 M17 8c0-2.76-2.24-5-5-5 M22 8c0 2.76-2.24 5-5 5h-1", visible: true },
      ],
    },
    {
      id: "website", label: "웹사이트", visible: true,
      items: [
        { id: "subdomain", href: "/dashboard/subdomains", label: "서브도메인", desc: "내이름.krl.kr 주소 만들기", icon: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z", visible: true },
        { id: "bio", href: "/tools/bio", label: "Link-in-bio", desc: "krl.kr/@닉네임 프로필 페이지", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", visible: true },
      ],
    },
    {
      id: "dev-tools", label: "개발 도구", visible: true,
      items: [
        { id: "ip-lookup", href: "/tools/dev", label: "IP 조회", desc: "IP 주소와 지역 정보 확인", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z", visible: true },
        { id: "uuid", href: "/tools/dev", label: "UUID 생성기", desc: "랜덤 UUID v4 생성", icon: "M7 7h10v10H7z M12 3v4 M12 17v4 M3 12h4 M17 12h4", visible: true },
        { id: "hash", href: "/tools/dev", label: "Hash 계산기", desc: "SHA-256/512 해시값 계산", icon: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18", visible: true },
        { id: "base64", href: "/tools/dev", label: "Base64", desc: "Base64 인코딩/디코딩", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6", visible: true },
        { id: "dns", href: "/tools/dev", label: "DNS 조회", desc: "A/CNAME/MX/TXT 레코드 확인", icon: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8 M3 3v5h5 M12 7v5l3 3", visible: true },
        { id: "jwt", href: "/tools/dev", label: "JWT 디코드", desc: "JWT 토큰 파싱 및 확인", icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z", visible: true },
      ],
    },
  ],
  simpleLinks: [
    { id: "community", href: "/community", label: "커뮤니티", visible: true },
    { id: "ai-chat", href: "/chat", label: "AI 채팅", icon: "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z M5 14v7M19 14v7M9 14v7M15 14v7", visible: true },
  ],
  rightButtons: {
    search: { visible: true, href: "/search" },
    report: { visible: true },
    donate: { visible: true, href: "/support", label: "후원" },
  },
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── Sub-Components ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      title={checked ? "숨기기" : "표시하기"}
      style={{
        width: "36px", height: "20px", borderRadius: "10px", border: "none",
        background: checked ? "var(--color-ink)" : "#d1d5db",
        cursor: "pointer", position: "relative", transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: "2px",
        left: checked ? "18px" : "2px",
        width: "16px", height: "16px", borderRadius: "50%",
        background: "white", transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        display: "block",
      }} />
    </button>
  );
}

function SvgIcon({ path, path2, size = 15, color = "currentColor" }: { path: string; path2?: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {path.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
      {path2 && path2.split(" M").map((d, i) => <path key={`p2-${i}`} d={i === 0 ? d : "M" + d} />)}
    </svg>
  );
}

function HeaderPreview({ config }: { config: HeaderConfig }) {
  return (
    <div style={{
      background: "rgba(243,240,238,0.93)", backdropFilter: "blur(16px)",
      border: "1px solid var(--color-hairline)", borderRadius: "12px",
      padding: "0 20px", height: "54px",
      display: "flex", alignItems: "center", gap: "2px",
      overflow: "hidden", userSelect: "none",
    }}>
      <span style={{
        fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1rem",
        letterSpacing: "0.04em", color: "var(--color-ink)",
        marginRight: "16px", flexShrink: 0,
      }}>{config.logo.text || "LOGO"}</span>

      {config.navMenus.filter(m => m.visible).map(menu => (
        <div key={menu.id} style={{
          display: "flex", alignItems: "center", gap: "3px",
          padding: "6px 10px", borderRadius: "6px",
          fontSize: "0.875rem", fontWeight: 500, color: "var(--color-body)",
          flexShrink: 0, cursor: "default",
        }}>
          {menu.label}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      ))}

      {config.simpleLinks.filter(l => l.visible).map(link => (
        <span key={link.id} style={{
          display: "flex", alignItems: "center", gap: "5px",
          padding: "6px 10px", borderRadius: "6px",
          fontSize: "0.875rem", fontWeight: 500, color: "var(--color-body)",
          flexShrink: 0,
        }}>
          {link.icon && <SvgIcon path={link.icon} size={13} color="var(--color-muted)" />}
          {link.label}
        </span>
      ))}

      <div style={{ flex: 1 }} />

      {config.rightButtons.search.visible && (
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", flexShrink: 0, color: "var(--color-body)" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      )}
      {config.rightButtons.report.visible && (
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", flexShrink: 0, color: "var(--color-muted)" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
      )}
      {config.rightButtons.donate.visible && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "5px",
          padding: "5px 12px", borderRadius: "99px",
          background: "var(--color-surface-card)",
          border: "1px solid var(--color-hairline-strong)",
          color: "#c0392b", fontSize: "0.8125rem", fontWeight: 600,
          flexShrink: 0,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 21.593c-.425-.439-6.593-6.408-6.593-10.093 0-3.535 2.878-6.5 6.593-6.5s6.593 2.965 6.593 6.5c0 3.685-6.168 9.654-6.593 10.093z" opacity=".3" />
            <path d="M12 2C7.589 2 4 5.589 4 10c0 4.766 7.078 11.485 7.38 11.77a.83.83 0 001.24 0C12.922 21.485 20 14.766 20 10c0-4.411-3.589-8-8-8zm0 12a4 4 0 110-8 4 4 0 010 8z" />
          </svg>
          {config.rightButtons.donate.label}
        </div>
      )}
    </div>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "7px 10px", borderRadius: "6px",
  border: "1px solid var(--color-hairline)",
  fontSize: "0.875rem", fontFamily: "var(--font-sans)",
  color: "var(--color-ink)", background: "var(--color-canvas)",
  outline: "none", boxSizing: "border-box",
};

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: "28px", height: "28px", borderRadius: "6px",
  border: "none", background: "transparent",
  color: "var(--color-muted)", cursor: "pointer",
  flexShrink: 0,
};

const addBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "5px",
  padding: "6px 12px", borderRadius: "6px",
  border: "1px dashed var(--color-hairline-strong)",
  background: "transparent", fontSize: "0.8125rem",
  fontWeight: 500, color: "var(--color-muted)",
  cursor: "pointer", fontFamily: "var(--font-sans)",
  marginTop: "8px",
};

function LabeledInput({ label, value, onChange, placeholder, mono }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean;
}) {
  return (
    <div>
      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-muted)", display: "block", marginBottom: "4px" }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ ...inputStyle, fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)" }} />
    </div>
  );
}

function SectionCard({ title, icon, action, children }: {
  title: string; icon: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--color-muted)", flexShrink: 0 }}>
            {icon.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
          </svg>
          <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--color-ink)" }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ background: "var(--color-white)", border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "16px" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Item Inline Editor ───────────────────────────────────────────────────────

function NavItemEditor({ item, onUpdate }: {
  item: NavItemConfig;
  onUpdate: (updates: Partial<NavItemConfig>) => void;
}) {
  return (
    <div style={{
      marginTop: "6px", padding: "14px 16px",
      background: "var(--color-canvas)", border: "1px solid var(--color-hairline)",
      borderRadius: "8px",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
        <LabeledInput label="이름" value={item.label} onChange={v => onUpdate({ label: v })} />
        <LabeledInput label="링크 URL" value={item.href} onChange={v => onUpdate({ href: v })} placeholder="/" mono />
      </div>
      <div style={{ marginBottom: "10px" }}>
        <LabeledInput label="설명" value={item.desc || ""} onChange={v => onUpdate({ desc: v })} placeholder="서비스 한 줄 설명..." />
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-muted)", display: "block", marginBottom: "4px" }}>
          SVG 아이콘 경로 (path data)
        </label>
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
          <textarea
            value={item.icon || ""}
            onChange={e => onUpdate({ icon: e.target.value })}
            placeholder={"M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z\n여러 path는 한 줄에 이어 쓰세요 (M으로 구분)"}
            rows={2}
            style={{
              ...inputStyle, resize: "vertical",
              fontFamily: "var(--font-mono)", fontSize: "0.75rem",
              lineHeight: 1.5,
            }}
          />
          {item.icon && (
            <div style={{
              width: "40px", height: "40px", display: "flex", alignItems: "center",
              justifyContent: "center", background: "var(--color-surface-card)",
              borderRadius: "8px", flexShrink: 0, color: "var(--color-muted)",
            }}>
              <SvgIcon path={item.icon} size={22} />
            </div>
          )}
        </div>
      </div>
      <div>
        <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-muted)", display: "block", marginBottom: "4px" }}>
          SVG 아이콘 경로 2 <span style={{ fontWeight: 400 }}>(선택 — 두 번째 path 요소)</span>
        </label>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            value={item.icon2 || ""}
            onChange={e => onUpdate({ icon2: e.target.value || undefined })}
            placeholder="두 번째 path (없으면 비워두세요)"
            style={{ ...inputStyle, fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}
          />
          {item.icon && item.icon2 && (
            <div style={{
              width: "40px", height: "40px", display: "flex", alignItems: "center",
              justifyContent: "center", background: "var(--color-surface-card)",
              borderRadius: "8px", flexShrink: 0, color: "var(--color-muted)",
            }}>
              <SvgIcon path={item.icon} path2={item.icon2} size={22} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SimpleLinkEditor({ link, onUpdate }: {
  link: SimpleLinkConfig;
  onUpdate: (updates: Partial<SimpleLinkConfig>) => void;
}) {
  return (
    <div style={{
      marginTop: "6px", padding: "14px 16px",
      background: "var(--color-canvas)", border: "1px solid var(--color-hairline)",
      borderRadius: "8px",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
        <LabeledInput label="이름" value={link.label} onChange={v => onUpdate({ label: v })} />
        <LabeledInput label="링크 URL" value={link.href} onChange={v => onUpdate({ href: v })} placeholder="/" mono />
      </div>
      <div>
        <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-muted)", display: "block", marginBottom: "4px" }}>
          SVG 아이콘 <span style={{ fontWeight: 400 }}>(선택)</span>
        </label>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            value={link.icon || ""}
            onChange={e => onUpdate({ icon: e.target.value || undefined })}
            placeholder="path data (없으면 텍스트만 표시)"
            style={{ ...inputStyle, fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}
          />
          {link.icon && (
            <div style={{
              width: "36px", height: "36px", display: "flex", alignItems: "center",
              justifyContent: "center", background: "var(--color-surface-card)",
              borderRadius: "8px", flexShrink: 0, color: "var(--color-muted)",
            }}>
              <SvgIcon path={link.icon} size={18} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminHeaderPage() {
  const [config, setConfig] = useState<HeaderConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [editingNavItem, setEditingNavItem] = useState<{ menuId: string; itemId: string } | null>(null);
  const [editingSimpleLink, setEditingSimpleLink] = useState<string | null>(null);

  const dragMenuIdx = useRef<number | null>(null);
  const dragItemRef = useRef<{ menuId: string; fromIdx: number } | null>(null);
  const dragSimpleLinkIdx = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/header")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.config) setConfig(d.config); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/admin/header", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (res.ok) {
        setSaveStatus("saved");
        try { sessionStorage.removeItem("headerConfig"); sessionStorage.removeItem("headerConfigTs"); } catch {}
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setSaving(false);
    }
  }

  // ── Menu helpers ──────────────────────────────────────────────────────────

  function moveMenu(from: number, to: number) {
    const arr = [...config.navMenus];
    arr.splice(to, 0, arr.splice(from, 1)[0]);
    setConfig({ ...config, navMenus: arr });
  }

  function updateMenu(id: string, updates: Partial<NavMenuConfig>) {
    setConfig({ ...config, navMenus: config.navMenus.map(m => m.id === id ? { ...m, ...updates } : m) });
  }

  function addMenu() {
    const newMenu: NavMenuConfig = { id: `menu-${uid()}`, label: "새 메뉴", visible: true, items: [] };
    setConfig({ ...config, navMenus: [...config.navMenus, newMenu] });
    setExpandedMenus(prev => new Set([...prev, newMenu.id]));
  }

  function removeMenu(id: string) {
    if (!confirm("이 메뉴와 모든 항목을 삭제하시겠습니까?")) return;
    setConfig({ ...config, navMenus: config.navMenus.filter(m => m.id !== id) });
    setExpandedMenus(prev => { const n = new Set(prev); n.delete(id); return n; });
  }

  // ── Item helpers ──────────────────────────────────────────────────────────

  function moveItem(menuId: string, from: number, to: number) {
    setConfig({
      ...config,
      navMenus: config.navMenus.map(m => {
        if (m.id !== menuId) return m;
        const items = [...m.items];
        items.splice(to, 0, items.splice(from, 1)[0]);
        return { ...m, items };
      }),
    });
  }

  function updateItem(menuId: string, itemId: string, updates: Partial<NavItemConfig>) {
    setConfig({
      ...config,
      navMenus: config.navMenus.map(m => {
        if (m.id !== menuId) return m;
        return { ...m, items: m.items.map(i => i.id === itemId ? { ...i, ...updates } : i) };
      }),
    });
  }

  function addItem(menuId: string) {
    const newItem: NavItemConfig = {
      id: `item-${uid()}`, href: "/", label: "새 항목",
      desc: "", icon: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z", visible: true,
    };
    setConfig({
      ...config,
      navMenus: config.navMenus.map(m =>
        m.id === menuId ? { ...m, items: [...m.items, newItem] } : m
      ),
    });
    setEditingNavItem({ menuId, itemId: newItem.id });
  }

  function removeItem(menuId: string, itemId: string) {
    setConfig({
      ...config,
      navMenus: config.navMenus.map(m =>
        m.id !== menuId ? m : { ...m, items: m.items.filter(i => i.id !== itemId) }
      ),
    });
    if (editingNavItem?.itemId === itemId) setEditingNavItem(null);
  }

  // ── Simple link helpers ───────────────────────────────────────────────────

  function moveSimpleLink(from: number, to: number) {
    const arr = [...config.simpleLinks];
    arr.splice(to, 0, arr.splice(from, 1)[0]);
    setConfig({ ...config, simpleLinks: arr });
  }

  function updateSimpleLink(id: string, updates: Partial<SimpleLinkConfig>) {
    setConfig({ ...config, simpleLinks: config.simpleLinks.map(l => l.id === id ? { ...l, ...updates } : l) });
  }

  function addSimpleLink() {
    const newLink: SimpleLinkConfig = { id: `link-${uid()}`, href: "/", label: "새 링크", visible: true };
    setConfig({ ...config, simpleLinks: [...config.simpleLinks, newLink] });
    setEditingSimpleLink(newLink.id);
  }

  function removeSimpleLink(id: string) {
    setConfig({ ...config, simpleLinks: config.simpleLinks.filter(l => l.id !== id) });
    if (editingSimpleLink === id) setEditingSimpleLink(null);
  }

  // ── Right button helpers ──────────────────────────────────────────────────

  function setRB<K extends keyof HeaderConfig["rightButtons"]>(
    key: K, updates: Partial<HeaderConfig["rightButtons"][K]>
  ) {
    setConfig({
      ...config,
      rightButtons: {
        ...config.rightButtons,
        [key]: { ...config.rightButtons[key], ...updates },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "var(--color-muted)" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        style={{ animation: "spin 1s linear infinite", marginRight: "8px" }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      불러오는 중...
    </div>
  );

  const saveBtnBg = saveStatus === "saved" ? "#16a34a" : saveStatus === "error" ? "#DC2626" : "var(--color-ink)";
  const saveBtnLabel = saving ? "저장 중..." : saveStatus === "saved" ? "저장됨 ✓" : saveStatus === "error" ? "저장 실패" : "저장하기";

  return (
    <div style={{ padding: "28px 32px", maxWidth: "860px" }}>
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>헤더 관리</h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", margin: "4px 0 0" }}>
            메뉴·링크·버튼을 자유롭게 편집하세요. 드래그로 순서를 바꿀 수 있습니다.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <button
            onClick={() => { if (confirm("기본 설정으로 초기화하시겠습니까?")) { setConfig(DEFAULT_CONFIG); setExpandedMenus(new Set()); setEditingNavItem(null); setEditingSimpleLink(null); } }}
            style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--color-hairline)", background: "transparent", fontSize: "0.875rem", fontWeight: 500, color: "var(--color-muted)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >초기화</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "8px 20px", borderRadius: "8px", border: "none", background: saveBtnBg, color: "white", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", transition: "background 0.2s", fontFamily: "var(--font-sans)" }}
          >{saveBtnLabel}</button>
        </div>
      </div>

      {/* ── Preview ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: "8px" }}>실시간 미리보기</p>
        <HeaderPreview config={config} />
      </div>

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <SectionCard title="로고" icon="M12 2L2 7l10 5 10-5-10-5M2 17l10 5 10-5M2 12l10 5 10-5">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <LabeledInput label="텍스트" value={config.logo.text} onChange={v => setConfig({ ...config, logo: { ...config.logo, text: v } })} placeholder="KRL.KR" mono />
          <LabeledInput label="링크 URL" value={config.logo.href} onChange={v => setConfig({ ...config, logo: { ...config.logo, href: v } })} placeholder="/" mono />
        </div>
      </SectionCard>

      {/* ── Nav Menus ─────────────────────────────────────────────────────── */}
      <SectionCard
        title="드롭다운 메뉴"
        icon="M4 6h16M4 12h16M4 18h7"
        action={
          <button onClick={addMenu} style={addBtnStyle}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            메뉴 추가
          </button>
        }
      >
        {config.navMenus.length === 0 && (
          <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", textAlign: "center", padding: "16px 0" }}>드롭다운 메뉴가 없습니다. 추가 버튼을 눌러 시작하세요.</p>
        )}
        {config.navMenus.map((menu, menuIdx) => {
          const isExpanded = expandedMenus.has(menu.id);
          return (
            <div
              key={menu.id}
              draggable
              onDragStart={() => { dragMenuIdx.current = menuIdx; }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => {
                if (dragMenuIdx.current !== null && dragMenuIdx.current !== menuIdx) {
                  moveMenu(dragMenuIdx.current, menuIdx);
                  dragMenuIdx.current = null;
                }
              }}
              style={{ border: "1px solid var(--color-hairline)", borderRadius: "10px", marginBottom: "8px", background: "var(--color-white)", overflow: "hidden" }}
            >
              {/* Menu row */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px" }}>
                <span style={{ color: "var(--color-hairline-strong)", cursor: "grab", fontSize: "18px", lineHeight: 1, userSelect: "none" }} title="드래그로 순서 변경">⠿</span>
                <Toggle checked={menu.visible} onChange={v => updateMenu(menu.id, { visible: v })} />
                <input
                  value={menu.label}
                  onChange={e => updateMenu(menu.id, { label: e.target.value })}
                  style={{ flex: 1, border: "none", background: "transparent", fontSize: "0.9375rem", fontWeight: 600, color: "var(--color-ink)", fontFamily: "var(--font-sans)", outline: "none", minWidth: 0 }}
                  placeholder="메뉴 이름"
                />
                <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", flexShrink: 0 }}>
                  항목 {menu.items.filter(i => i.visible).length}/{menu.items.length}
                </span>
                <button
                  onClick={() => setExpandedMenus(prev => {
                    const n = new Set(prev);
                    if (n.has(menu.id)) n.delete(menu.id); else n.add(menu.id);
                    return n;
                  })}
                  style={iconBtnStyle}
                  title={isExpanded ? "접기" : "펼치기"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <button onClick={() => removeMenu(menu.id)} style={{ ...iconBtnStyle, color: "#DC2626" }} title="메뉴 삭제">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>

              {/* Expanded items */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--color-hairline)", padding: "12px 14px", background: "var(--color-lifted)" }}>
                  {menu.items.length === 0 && (
                    <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginBottom: "8px" }}>항목이 없습니다.</p>
                  )}
                  {menu.items.map((item, itemIdx) => {
                    const isEditingThis = editingNavItem?.menuId === menu.id && editingNavItem?.itemId === item.id;
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => { dragItemRef.current = { menuId: menu.id, fromIdx: itemIdx }; }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => {
                          if (dragItemRef.current?.menuId === menu.id && dragItemRef.current.fromIdx !== itemIdx) {
                            moveItem(menu.id, dragItemRef.current.fromIdx, itemIdx);
                            dragItemRef.current = null;
                          }
                        }}
                        style={{ marginBottom: "6px" }}
                      >
                        <div style={{
                          display: "flex", alignItems: "center", gap: "8px",
                          padding: "8px 10px", borderRadius: "8px",
                          background: isEditingThis ? "var(--color-surface-card)" : "var(--color-white)",
                          border: `1px solid ${isEditingThis ? "var(--color-hairline-strong)" : "var(--color-hairline)"}`,
                          transition: "background 0.1s",
                        }}>
                          <span style={{ color: "var(--color-hairline-strong)", cursor: "grab", fontSize: "16px", lineHeight: 1, userSelect: "none" }}>⠿</span>
                          <Toggle checked={item.visible} onChange={v => updateItem(menu.id, item.id, { visible: v })} />
                          {item.icon && (
                            <div style={{ color: "var(--color-muted)", flexShrink: 0 }}>
                              <SvgIcon path={item.icon} path2={item.icon2} size={14} />
                            </div>
                          )}
                          <span style={{ flex: 1, fontSize: "0.875rem", fontWeight: 500, color: item.visible ? "var(--color-ink)" : "var(--color-muted)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.label}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", fontFamily: "var(--font-mono)", flexShrink: 0, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.href}
                          </span>
                          <button
                            onClick={() => setEditingNavItem(isEditingThis ? null : { menuId: menu.id, itemId: item.id })}
                            style={{ ...iconBtnStyle, color: isEditingThis ? "var(--color-ink)" : "var(--color-muted)" }}
                            title="편집"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => removeItem(menu.id, item.id)}
                            style={{ ...iconBtnStyle, color: "#DC2626" }}
                            title="삭제"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                        {isEditingThis && (
                          <NavItemEditor
                            item={item}
                            onUpdate={updates => updateItem(menu.id, item.id, updates)}
                          />
                        )}
                      </div>
                    );
                  })}
                  <button onClick={() => addItem(menu.id)} style={addBtnStyle}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    항목 추가
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </SectionCard>

      {/* ── Simple Links ──────────────────────────────────────────────────── */}
      <SectionCard
        title="단순 링크"
        icon="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1"
        action={
          <button onClick={addSimpleLink} style={addBtnStyle}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            링크 추가
          </button>
        }
      >
        {config.simpleLinks.length === 0 && (
          <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", textAlign: "center", padding: "12px 0" }}>단순 링크가 없습니다.</p>
        )}
        {config.simpleLinks.map((link, idx) => {
          const isEditingThis = editingSimpleLink === link.id;
          return (
            <div
              key={link.id}
              draggable
              onDragStart={() => { dragSimpleLinkIdx.current = idx; }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => {
                if (dragSimpleLinkIdx.current !== null && dragSimpleLinkIdx.current !== idx) {
                  moveSimpleLink(dragSimpleLinkIdx.current, idx);
                  dragSimpleLinkIdx.current = null;
                }
              }}
              style={{ marginBottom: "6px" }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "10px 12px", borderRadius: "8px",
                background: isEditingThis ? "var(--color-surface-card)" : "var(--color-white)",
                border: `1px solid ${isEditingThis ? "var(--color-hairline-strong)" : "var(--color-hairline)"}`,
              }}>
                <span style={{ color: "var(--color-hairline-strong)", cursor: "grab", fontSize: "18px", lineHeight: 1, userSelect: "none" }}>⠿</span>
                <Toggle checked={link.visible} onChange={v => updateSimpleLink(link.id, { visible: v })} />
                {link.icon && <div style={{ color: "var(--color-muted)", flexShrink: 0 }}><SvgIcon path={link.icon} size={14} /></div>}
                <span style={{ flex: 1, fontSize: "0.9375rem", fontWeight: 500, color: link.visible ? "var(--color-ink)" : "var(--color-muted)" }}>{link.label}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{link.href}</span>
                <button
                  onClick={() => setEditingSimpleLink(isEditingThis ? null : link.id)}
                  style={{ ...iconBtnStyle, color: isEditingThis ? "var(--color-ink)" : "var(--color-muted)" }}
                  title="편집"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button onClick={() => removeSimpleLink(link.id)} style={{ ...iconBtnStyle, color: "#DC2626" }} title="삭제">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              {isEditingThis && (
                <SimpleLinkEditor link={link} onUpdate={updates => updateSimpleLink(link.id, updates)} />
              )}
            </div>
          );
        })}
      </SectionCard>

      {/* ── Right Buttons ─────────────────────────────────────────────────── */}
      <SectionCard title="우측 버튼" icon="M4 6h16M4 12h8M4 18h4">
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid var(--color-hairline)" }}>
          <Toggle checked={config.rightButtons.search.visible} onChange={v => setRB("search", { visible: v })} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100px", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-ink)" }}>검색</span>
          </div>
          <div style={{ flex: 1 }}>
            <input
              value={config.rightButtons.search.href}
              onChange={e => setRB("search", { href: e.target.value })}
              placeholder="/search"
              style={{ ...inputStyle, fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}
            />
          </div>
        </div>

        {/* Report */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid var(--color-hairline)" }}>
          <Toggle checked={config.rightButtons.report.visible} onChange={v => setRB("report", { visible: v })} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100px", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-ink)" }}>신고 버튼</span>
          </div>
          <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>로그인 사용자에게만 표시됩니다</span>
        </div>

        {/* Donate */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0" }}>
          <Toggle checked={config.rightButtons.donate.visible} onChange={v => setRB("donate", { visible: v })} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100px", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#c0392b" stroke="none" style={{ flexShrink: 0 }}>
              <path d="M12 2C7.589 2 4 5.589 4 10c0 4.766 7.078 11.485 7.38 11.77a.83.83 0 001.24 0C12.922 21.485 20 14.766 20 10c0-4.411-3.589-8-8-8zm0 12a4 4 0 110-8 4 4 0 010 8z" />
            </svg>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-ink)" }}>후원 버튼</span>
          </div>
          <div style={{ display: "flex", gap: "8px", flex: 1 }}>
            <input
              value={config.rightButtons.donate.href}
              onChange={e => setRB("donate", { href: e.target.value })}
              placeholder="/support"
              style={{ ...inputStyle, fontFamily: "var(--font-mono)", fontSize: "0.8125rem", flex: 1 }}
            />
            <div style={{ flexShrink: 0, width: "90px" }}>
              <input
                value={config.rightButtons.donate.label}
                onChange={e => setRB("donate", { label: e.target.value })}
                placeholder="후원"
                style={{ ...inputStyle, textAlign: "center" }}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "4px" }}>
        * 저장 후 최대 30초 내에 실제 헤더에 반영됩니다.
      </p>
    </div>
  );
}
