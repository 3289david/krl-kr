"use client";
import { useState } from "react";

type Template = "professional" | "student" | "freelancer" | "minimal";

interface SigData {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  twitter: string;
  accentColor: string;
}

function generateHTML(data: SigData, template: Template): string {
  const color = data.accentColor || "#6366f1";

  if (template === "minimal") {
    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
  <tr><td style="font-weight:bold;font-size:16px;color:#111;">${data.name}</td></tr>
  ${data.title ? `<tr><td style="color:#666;font-size:13px;">${data.title}</td></tr>` : ""}
  ${data.email ? `<tr><td style="color:${color};font-size:13px;"><a href="mailto:${data.email}" style="color:${color};text-decoration:none;">${data.email}</a></td></tr>` : ""}
  ${data.phone ? `<tr><td style="color:#666;font-size:13px;">${data.phone}</td></tr>` : ""}
</table>`;
  }

  if (template === "professional") {
    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:14px;">
  <tr>
    <td style="padding-right:20px;border-right:3px solid ${color};vertical-align:top;">
      <div style="font-size:20px;font-weight:bold;color:#111;white-space:nowrap;">${data.name}</div>
      ${data.title ? `<div style="font-size:13px;color:#666;margin-top:2px;">${data.title}</div>` : ""}
      ${data.company ? `<div style="font-size:13px;font-weight:600;color:${color};margin-top:2px;">${data.company}</div>` : ""}
    </td>
    <td style="padding-left:20px;vertical-align:top;">
      ${data.email ? `<div style="margin-bottom:4px;"><a href="mailto:${data.email}" style="color:#333;text-decoration:none;font-size:13px;">✉ ${data.email}</a></div>` : ""}
      ${data.phone ? `<div style="margin-bottom:4px;color:#333;font-size:13px;">📞 ${data.phone}</div>` : ""}
      ${data.website ? `<div style="margin-bottom:4px;"><a href="${data.website}" style="color:${color};text-decoration:none;font-size:13px;">🌐 ${data.website.replace(/^https?:\/\//, "")}</a></div>` : ""}
      ${data.linkedin ? `<div style="margin-bottom:4px;"><a href="${data.linkedin}" style="color:${color};text-decoration:none;font-size:13px;">in LinkedIn</a></div>` : ""}
      ${data.twitter ? `<div><a href="https://twitter.com/${data.twitter.replace("@","")}" style="color:${color};text-decoration:none;font-size:13px;">𝕏 ${data.twitter}</a></div>` : ""}
    </td>
  </tr>
</table>`;
  }

  if (template === "student") {
    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:14px;">
  <tr>
    <td>
      <div style="font-size:18px;font-weight:bold;color:#111;">${data.name}</div>
      ${data.title ? `<div style="font-size:13px;color:#666;margin-top:2px;">${data.title}</div>` : ""}
      ${data.company ? `<div style="font-size:13px;color:${color};font-weight:600;margin-top:2px;">${data.company}</div>` : ""}
      <div style="border-top:2px solid ${color};margin:10px 0;width:200px;"></div>
      <table cellpadding="0" cellspacing="0" border="0">
        ${data.email ? `<tr><td style="font-size:13px;color:#555;padding-bottom:3px;"><a href="mailto:${data.email}" style="color:#555;text-decoration:none;">${data.email}</a></td></tr>` : ""}
        ${data.phone ? `<tr><td style="font-size:13px;color:#555;padding-bottom:3px;">${data.phone}</td></tr>` : ""}
        ${data.website ? `<tr><td style="font-size:13px;padding-bottom:3px;"><a href="${data.website}" style="color:${color};text-decoration:none;">${data.website}</a></td></tr>` : ""}
        ${data.linkedin ? `<tr><td style="font-size:13px;"><a href="${data.linkedin}" style="color:${color};text-decoration:none;">LinkedIn 프로필</a></td></tr>` : ""}
      </table>
    </td>
  </tr>
</table>`;
  }

  // Freelancer
  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:14px;max-width:420px;">
  <tr>
    <td style="background:${color};padding:16px 20px;border-radius:8px 0 0 8px;vertical-align:top;width:4px;"></td>
    <td style="background:#f8f8f8;padding:16px 20px;border-radius:0 8px 8px 0;vertical-align:top;">
      <div style="font-size:18px;font-weight:bold;color:#111;margin-bottom:2px;">${data.name}</div>
      ${data.title ? `<div style="font-size:13px;color:${color};font-weight:600;margin-bottom:8px;">${data.title}</div>` : ""}
      ${data.email ? `<div style="font-size:13px;color:#555;margin-bottom:3px;"><a href="mailto:${data.email}" style="color:#555;text-decoration:none;">${data.email}</a></div>` : ""}
      ${data.phone ? `<div style="font-size:13px;color:#555;margin-bottom:3px;">${data.phone}</div>` : ""}
      ${data.website ? `<div style="font-size:13px;margin-bottom:3px;"><a href="${data.website}" style="color:${color};text-decoration:none;font-weight:600;">${data.website.replace(/^https?:\/\//, "")}</a></div>` : ""}
      <div style="margin-top:8px;display:flex;gap:8px;">
        ${data.linkedin ? `<a href="${data.linkedin}" style="color:${color};text-decoration:none;font-size:12px;font-weight:600;">LinkedIn</a>` : ""}
        ${data.twitter ? `<a href="https://twitter.com/${data.twitter.replace("@","")}" style="color:${color};text-decoration:none;font-size:12px;font-weight:600;">${data.twitter}</a>` : ""}
      </div>
    </td>
  </tr>
</table>`;
}

const TEMPLATES: { id: Template; label: string; desc: string }[] = [
  { id: "professional", label: "프로페셔널", desc: "직장인·비즈니스용" },
  { id: "student", label: "학생", desc: "대학생·구직자용" },
  { id: "freelancer", label: "프리랜서", desc: "디자이너·개발자·크리에이터" },
  { id: "minimal", label: "미니멀", desc: "심플하고 깔끔한 스타일" },
];

export default function SignaturePage() {
  const [template, setTemplate] = useState<Template>("professional");
  const [data, setData] = useState<SigData>({
    name: "김민준",
    title: "프론트엔드 개발자",
    company: "KRL Corporation",
    email: "minjun@example.com",
    phone: "+82 10-1234-5678",
    website: "https://krl.kr",
    linkedin: "https://linkedin.com/in/minjun",
    twitter: "@minjundev",
    accentColor: "#6366f1",
  });
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"preview" | "html">("preview");

  const html = generateHTML(data, template);

  function set(key: keyof SigData, val: string) {
    setData(prev => ({ ...prev, [key]: val }));
  }

  async function copy() {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px",
    border: "1px solid var(--color-hairline)",
    borderRadius: "8px", background: "var(--color-canvas)",
    fontSize: "0.875rem", boxSizing: "border-box",
    fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.75rem", fontWeight: 600,
    marginBottom: "5px", color: "var(--color-muted)",
  };

  const ACCENT_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#111111"];

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: "900px" }}>
      <h1 style={{ fontSize: "clamp(1.25rem,3vw,1.5rem)", fontWeight: 700, marginBottom: "6px" }}>KRL Signature</h1>
      <p style={{ color: "var(--color-muted)", marginBottom: "24px", fontSize: "0.9375rem" }}>
        이메일 서명 HTML을 생성합니다. Gmail, Outlook, Apple Mail에 붙여넣기하세요.
      </p>

      {/* Template selection */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => setTemplate(t.id)}
            style={{
              padding: "10px 18px", textAlign: "left",
              border: `1.5px solid ${template === t.id ? "var(--color-accent)" : "var(--color-hairline)"}`,
              borderRadius: "10px", cursor: "pointer",
              background: template === t.id ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
              transition: "all 0.1s",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "0.875rem", color: template === t.id ? "var(--color-accent)" : "var(--color-ink)" }}>{t.label}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{t.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {/* Form */}
        <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>정보 입력</p>

          {[
            { key: "name" as const, label: "이름 *", placeholder: "김민준" },
            { key: "title" as const, label: "직함/전공", placeholder: "프론트엔드 개발자" },
            { key: "company" as const, label: "회사/학교", placeholder: "KRL Corporation" },
            { key: "email" as const, label: "이메일", placeholder: "you@example.com" },
            { key: "phone" as const, label: "전화번호", placeholder: "+82 10-0000-0000" },
            { key: "website" as const, label: "웹사이트", placeholder: "https://example.com" },
            { key: "linkedin" as const, label: "LinkedIn URL", placeholder: "https://linkedin.com/in/you" },
            { key: "twitter" as const, label: "트위터/X", placeholder: "@username" },
          ].map(field => (
            <div key={field.key}>
              <label style={labelStyle}>{field.label}</label>
              <input
                value={data[field.key]}
                onChange={e => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                style={inputStyle}
              />
            </div>
          ))}

          <div>
            <label style={labelStyle}>강조 색상</label>
            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
              {ACCENT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => set("accentColor", c)}
                  style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    background: c, border: data.accentColor === c ? "3px solid var(--color-ink)" : "2px solid transparent",
                    cursor: "pointer",
                  }}
                />
              ))}
              <input
                type="color"
                value={data.accentColor}
                onChange={e => set("accentColor", e.target.value)}
                style={{ width: "32px", height: "28px", cursor: "pointer", border: "1px solid var(--color-hairline)", borderRadius: "6px", padding: "2px" }}
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "16px", overflow: "hidden" }}>
            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--color-hairline)" }}>
              {(["preview", "html"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: "12px",
                    background: tab === t ? "var(--color-canvas)" : "transparent",
                    border: "none", cursor: "pointer",
                    fontSize: "0.8125rem", fontWeight: tab === t ? 700 : 400,
                    color: tab === t ? "var(--color-ink)" : "var(--color-muted)",
                    borderBottom: tab === t ? "2px solid var(--color-accent)" : "2px solid transparent",
                    margin: "0 0 -1px",
                  }}
                >
                  {t === "preview" ? "미리보기" : "HTML 코드"}
                </button>
              ))}
            </div>

            <div style={{ padding: "24px" }}>
              {tab === "preview" ? (
                <div>
                  {/* Simulated email client */}
                  <div style={{ background: "#f5f5f5", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                    <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: "12px", fontStyle: "italic" }}>— 이메일 서명 미리보기 —</div>
                    <div dangerouslySetInnerHTML={{ __html: html }} />
                  </div>
                  <div style={{ background: "#1a1a1a", borderRadius: "8px", padding: "16px" }}>
                    <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: "12px", fontStyle: "italic" }}>— 다크 배경 미리보기 —</div>
                    <div dangerouslySetInnerHTML={{ __html: html }} />
                  </div>
                </div>
              ) : (
                <div>
                  <pre style={{
                    background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)",
                    borderRadius: "8px", padding: "14px",
                    fontFamily: "monospace", fontSize: "0.7rem",
                    color: "var(--color-body)", overflowX: "auto",
                    lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all",
                    margin: 0, maxHeight: "300px", overflowY: "auto",
                  }}>
                    {html}
                  </pre>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={copy}
            style={{
              padding: "14px 24px",
              background: copied ? "#22c55e" : "var(--color-accent)",
              color: "#fff", border: "none", borderRadius: "12px",
              cursor: "pointer", fontSize: "1rem", fontWeight: 700,
              transition: "background 0.2s",
            }}
          >
            {copied ? "✓ HTML 복사됨!" : "HTML 코드 복사"}
          </button>

          <div style={{
            padding: "14px 16px",
            background: "color-mix(in srgb, #f59e0b 10%, transparent)",
            border: "1px solid color-mix(in srgb, #f59e0b 30%, transparent)",
            borderRadius: "10px",
            fontSize: "0.8125rem", lineHeight: 1.6, color: "var(--color-body)",
          }}>
            <strong>Gmail에 붙여넣기:</strong> 설정 → 서명 → 서명 편집란에서 HTML 소스 편집 모드 활성화 후 붙여넣기
          </div>
        </div>
      </div>
    </div>
  );
}
