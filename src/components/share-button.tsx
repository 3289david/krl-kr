"use client";
import { useState } from "react";

interface ShareButtonProps {
  type: string;
  id: number;
  initialPublic?: boolean;
  initialToken?: string | null;
}

export function ShareButton({ type, id, initialPublic = false, initialToken = null }: ShareButtonProps) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const shareUrl = token ? `https://krl.kr/share/${type}/${token}` : null;

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, is_public: !isPublic }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsPublic(data.is_public);
        setToken(data.share_token);
        if (data.is_public && data.share_token) setShowUrl(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const el = document.createElement("textarea");
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={toggle}
          disabled={loading}
          style={{
            padding: "4px 12px", borderRadius: 6, border: "1px solid var(--color-hairline)",
            background: isPublic ? "#dcfce7" : "var(--color-surface)",
            color: isPublic ? "#16a34a" : "var(--color-muted)",
            fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          {loading ? "..." : isPublic ? "공개 중" : "공유"}
        </button>
        {isPublic && shareUrl && (
          <button
            onClick={copyLink}
            style={{
              padding: "4px 10px", borderRadius: 6, border: "1px solid var(--color-hairline)",
              background: copied ? "#dcfce7" : "var(--color-surface)",
              color: copied ? "#16a34a" : "var(--color-muted)",
              fontSize: "0.8125rem", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {copied ? "✓ 복사됨" : "링크 복사"}
          </button>
        )}
        {isPublic && shareUrl && (
          <button
            onClick={() => setShowUrl(v => !v)}
            style={{
              padding: "4px 8px", borderRadius: 6, border: "1px solid var(--color-hairline)",
              background: "var(--color-surface)", color: "var(--color-muted)",
              fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {showUrl ? "▲" : "▼"}
          </button>
        )}
      </div>
      {isPublic && shareUrl && showUrl && (
        <div
          onClick={copyLink}
          style={{
            padding: "4px 8px", borderRadius: 4, background: "var(--color-surface)",
            border: "1px solid var(--color-hairline)", fontSize: "0.75rem",
            color: "var(--color-accent)", cursor: "pointer", wordBreak: "break-all",
            maxWidth: "280px",
          }}
          title="클릭해서 복사"
        >
          {shareUrl}
        </div>
      )}
    </div>
  );
}
