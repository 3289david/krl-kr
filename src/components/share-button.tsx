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

  const shareUrl = token ? `https://krl.kr/share/${type}/${token}` : null;

  async function toggle() {
    setLoading(true);
    const res = await fetch("/api/v1/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, is_public: !isPublic }),
    });
    if (res.ok) {
      const data = await res.json();
      setIsPublic(data.is_public);
      setToken(data.share_token);
    }
    setLoading(false);
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={toggle} disabled={loading} style={{
        padding: "6px 14px", borderRadius: 8, border: "1px solid var(--color-hairline)",
        background: isPublic ? "#dcfce7" : "var(--color-surface)",
        color: isPublic ? "#16a34a" : "var(--color-muted)",
        fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
        fontFamily: "inherit",
      }}>
        {loading ? "..." : isPublic ? "공유 중" : "공유"}
      </button>
      {isPublic && shareUrl && (
        <button onClick={copyLink} style={{
          padding: "6px 14px", borderRadius: 8, border: "1px solid var(--color-hairline)",
          background: "var(--color-surface)", color: "var(--color-ink)",
          fontSize: "0.8125rem", cursor: "pointer", fontFamily: "inherit",
        }}>
          {copied ? "✓ 복사됨" : "링크 복사"}
        </button>
      )}
    </div>
  );
}
