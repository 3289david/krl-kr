"use client";
import { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, CheckIcon } from "@/components/icons";

interface BioLink { title: string; url: string; }
interface BioSocial { twitter?: string; instagram?: string; github?: string; youtube?: string; tiktok?: string; }

export default function BioPage() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [theme, setTheme] = useState<"default"|"dark"|"minimal">("default");
  const [links, setLinks] = useState<BioLink[]>([]);
  const [social, setSocial] = useState<BioSocial>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/v1/bio")
      .then((r) => r.json())
      .then((data) => {
        if (data.page) {
          const p = data.page;
          setUsername(p.username ?? "");
          setDisplayName(p.display_name ?? "");
          setBio(p.bio ?? "");
          setAvatarUrl(p.avatar_url ?? "");
          setTheme(p.theme ?? "default");
          setLinks(p.links ?? []);
          setSocial(p.social ?? {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/v1/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, display_name: displayName, bio, avatar_url: avatarUrl || null, theme, links, social }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "저장에 실패했습니다."); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { setError("네트워크 오류가 발생했습니다."); }
    finally { setSaving(false); }
  }

  function addLink() { setLinks((prev) => [...prev, { title: "", url: "" }]); }
  function removeLink(i: number) { setLinks((prev) => prev.filter((_, idx) => idx !== i)); }
  function updateLink(i: number, key: keyof BioLink, val: string) {
    setLinks((prev) => prev.map((l, idx) => idx === i ? { ...l, [key]: val } : l));
  }

  const themes = [
    { value: "default", label: "기본 (밝은)" },
    { value: "dark", label: "다크" },
    { value: "minimal", label: "미니멀" },
  ];

  if (loading) return <div style={{ padding: "32px", color: "var(--color-muted)" }}>로딩 중...</div>;

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "4px" }}>Link-in-bio</h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)" }}>
            {username ? <>공개 링크: <a href={`/@${username}`} target="_blank" rel="noopener" style={{ color: "var(--color-arc)" }}>krl.kr/@{username}</a></> : "사용자명을 설정하세요"}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving || !username} className="btn btn-primary btn-pill" style={{ gap: "6px" }}>
          {saved ? <><CheckIcon size={16} />저장됨</> : saving ? "저장 중..." : "변경사항 저장"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "var(--radius-sm)", marginBottom: "20px", color: "#9B1C1C", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px" }}>
          {/* Main settings */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Profile */}
            <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "20px" }}>프로필</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>
                    사용자명 * <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>(krl.kr/@username)</span>
                  </label>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ padding: "10px 12px", background: "var(--color-surface-card)", border: "1px solid var(--color-hairline-strong)", borderRight: "none", borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)", fontSize: "0.875rem", color: "var(--color-muted)" }}>@</span>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" required className="input" style={{ borderRadius: "0 var(--radius-sm) var(--radius-sm) 0" }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>표시 이름</label>
                  <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="홍길동" className="input" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>소개</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="자기소개를 입력하세요..." rows={3} className="input" style={{ resize: "vertical" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "6px" }}>프로필 이미지 URL</label>
                  <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.jpg" className="input" />
                </div>
              </div>
            </div>

            {/* Links */}
            <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>링크 목록</h3>
                <button type="button" onClick={addLink} className="btn btn-secondary btn-sm btn-pill" style={{ gap: "4px" }}>
                  <PlusIcon size={14} />추가
                </button>
              </div>
              {links.length === 0 ? (
                <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", textAlign: "center", padding: "20px 0" }}>링크를 추가하세요</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {links.map((link, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                        <input type="text" value={link.title} onChange={(e) => updateLink(i, "title", e.target.value)} placeholder="링크 제목" className="input" style={{ fontSize: "0.875rem" }} />
                        <input type="url" value={link.url} onChange={(e) => updateLink(i, "url", e.target.value)} placeholder="https://..." className="input" style={{ fontSize: "0.875rem" }} />
                      </div>
                      <button type="button" onClick={() => removeLink(i)} className="btn btn-ghost btn-icon" style={{ color: "var(--color-danger)", marginTop: "6px" }}>
                        <TrashIcon size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Social */}
            <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "24px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "20px" }}>소셜 링크</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {(["twitter", "instagram", "github", "youtube", "tiktok"] as const).map((platform) => (
                  <div key={platform}>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "4px", textTransform: "capitalize" }}>{platform}</label>
                    <input
                      type="text"
                      value={social[platform] ?? ""}
                      onChange={(e) => setSocial((prev) => ({ ...prev, [platform]: e.target.value || undefined }))}
                      placeholder={platform === "twitter" ? "@username" : platform === "github" ? "username" : "https://..."}
                      className="input"
                      style={{ fontSize: "0.875rem" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preview panel */}
          <div style={{ position: "sticky", top: "24px" }}>
            {/* Theme picker */}
            <div style={{ background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)", padding: "20px", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "12px" }}>테마</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {themes.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTheme(t.value as "default" | "dark" | "minimal")}
                    style={{
                      padding: "10px 14px", border: "1px solid",
                      borderColor: theme === t.value ? "var(--color-ink)" : "var(--color-hairline)",
                      borderRadius: "var(--radius-sm)", background: theme === t.value ? "var(--color-ink)" : "transparent",
                      color: theme === t.value ? "var(--color-canvas)" : "var(--color-body)",
                      cursor: "pointer", fontSize: "0.875rem", fontWeight: 500,
                      textAlign: "left", fontFamily: "var(--font-sans)",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{
              background: theme === "dark" ? "#1a1a1a" : theme === "minimal" ? "#ffffff" : "var(--color-canvas)",
              border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)",
              padding: "24px", textAlign: "center",
            }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: "16px" }}>
                미리보기
              </p>
              {avatarUrl && (
                <img src={avatarUrl} alt="avatar" style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", margin: "0 auto 12px" }} />
              )}
              <p style={{ fontWeight: 700, fontSize: "1rem", color: theme === "dark" ? "#fff" : "var(--color-ink)", marginBottom: "4px" }}>
                {displayName || username || "이름 없음"}
              </p>
              {bio && <p style={{ fontSize: "0.8125rem", color: theme === "dark" ? "rgba(255,255,255,0.6)" : "var(--color-muted)", marginBottom: "16px" }}>{bio}</p>}
              {links.slice(0, 3).map((l, i) => (
                <div key={i} style={{
                  padding: "10px 16px", marginBottom: "8px",
                  background: theme === "dark" ? "rgba(255,255,255,0.1)" : "var(--color-surface-card)",
                  borderRadius: "var(--radius-lg)", fontSize: "0.875rem", fontWeight: 500,
                  color: theme === "dark" ? "#fff" : "var(--color-ink)",
                }}>
                  {l.title || l.url}
                </div>
              ))}
              {links.length > 3 && (
                <p style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>+{links.length - 3}개 더...</p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
