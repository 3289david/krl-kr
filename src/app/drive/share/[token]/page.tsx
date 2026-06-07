"use client";
import { useState, useEffect, use, useCallback } from "react";

function fmt(bytes: number) {
  if (!bytes) return "0 B";
  const u = ["B","KB","MB","GB","TB"];
  const i = Math.floor(Math.log(bytes)/Math.log(1024));
  return `${(bytes/1024**i).toFixed(1)} ${u[i]}`;
}

function MimeIcon({ mime, type, size=40 }: { mime?: string|null; type?: string; size?: number }) {
  const m = mime ?? "";
  const color = type === "folder" ? "#f59e0b"
    : m.startsWith("image/") ? "#3b82f6"
    : m.startsWith("video/") ? "#8b5cf6"
    : m.startsWith("audio/") ? "#ec4899"
    : m.includes("pdf") ? "#ef4444"
    : m.includes("zip") || m.includes("tar") ? "#f97316"
    : "#6b7280";
  if (type === "folder") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M2 6a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6"/>
    </svg>
  );
}

interface FileRow { id: number; name: string; type: string; size: number; mime_type: string; download_count: number; created_at: number; }
interface FolderData { type: "folder"; id: number; name: string; token: string; files: FileRow[]; breadcrumb: {id:number;name:string}[]; password_protected: boolean; }
interface FileMeta { type: "file"; name: string; size: number; mime_type: string; created_at: number; download_count: number; password_protected: boolean; }

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<FolderData | FileMeta | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [needPw, setNeedPw] = useState(false);
  const [subFolder, setSubFolder] = useState<number | null>(null);

  const load = useCallback(async (folderId?: number, pw?: string) => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams({ meta: "1" });
      if (folderId) qs.set("folder", String(folderId));
      if (pw) qs.set("password", pw);
      const r = await fetch(`/api/v1/drive/share/${token}?${qs}`);
      if (r.status === 403) { setNeedPw(true); setLoading(false); return; }
      if (!r.ok) { const d = await r.json(); setErr(d.error || "찾을 수 없습니다."); setLoading(false); return; }
      const d = await r.json();
      setNeedPw(false);
      setData(d);
    } catch { setErr("네트워크 오류"); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function browse(id: number) { setSubFolder(id); load(id, password || undefined); }
  function goUp(id?: number) { setSubFolder(id ?? null); load(id, password || undefined); }

  function dlUrl(fileToken?: string, folderId?: number, pw?: string) {
    const qs = new URLSearchParams({ action: "download" });
    if (folderId) qs.set("folder", String(folderId));
    if (pw) qs.set("password", pw);
    return fileToken
      ? `/api/v1/drive/share/${fileToken}?${qs}`
      : `/api/v1/drive/share/${token}?${qs}`;
  }

  const card: React.CSSProperties = { background: "var(--color-surface,#fff)", border: "1px solid var(--color-hairline,#e5e7eb)", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,.06)" };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
      <div style={{ textAlign: "center", color: "#9ca3af" }}>불러오는 중...</div>
    </div>
  );

  if (needPw) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", padding: 16 }}>
      <div style={{ ...card, padding: "36px 40px", maxWidth: 400, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={1.5} style={{ margin: "0 auto 12px", display: "block" }}>
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          <p style={{ fontWeight: 600, fontSize: "1rem" }}>비밀번호 보호 링크입니다</p>
        </div>
        <input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && load(subFolder ?? undefined, password)} type="password" placeholder="비밀번호 입력"
          style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, marginBottom: 12, fontSize: "0.9rem", boxSizing: "border-box" }} />
        {err && <p style={{ color: "#dc2626", fontSize: "0.8rem", marginBottom: 8 }}>{err}</p>}
        <button onClick={() => load(subFolder ?? undefined, password)}
          style={{ width: "100%", padding: "11px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
          확인
        </button>
      </div>
    </div>
  );

  if (err || !data) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", padding: 16 }}>
      <div style={{ ...card, padding: "40px", maxWidth: 420, width: "100%", textAlign: "center" }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={1.5} style={{ margin: "0 auto 16px", display: "block" }}>
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
        </svg>
        <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>찾을 수 없습니다</h2>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: 20 }}>{err || "공유가 해제되었거나 만료된 링크입니다."}</p>
        <a href="/" style={{ color: "#2563eb", textDecoration: "none", fontSize: "0.9rem" }}>← KRL.KR로 돌아가기</a>
      </div>
    </div>
  );

  const pw = password || undefined;

  // ── Folder view ──────────────────────────────────────────────────────────────
  if (data.type === "folder") {
    const fd = data as FolderData;
    return (
      <div style={{ minHeight: "100vh", background: "#f3f4f6", fontFamily: "system-ui, sans-serif" }}>
        {/* Header */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/" style={{ textDecoration: "none", fontWeight: 700, fontSize: "1.1rem", color: "#111", letterSpacing: "-0.03em" }}>KRL<span style={{ color: "#2563eb" }}>.KR</span></a>
          <span style={{ color: "#d1d5db" }}>|</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b"><path d="M2 6a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>
          <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>공유 폴더</span>
          <div style={{ marginLeft: "auto" }}>
            <a href={dlUrl(undefined, subFolder ?? undefined, pw)} download
              style={{ padding: "7px 16px", background: "#2563eb", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              ZIP 다운로드
            </a>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", marginBottom: 16, flexWrap: "wrap" }}>
            <button onClick={() => goUp()} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", padding: 0, fontWeight: 600 }}>{fd.name}</button>
            {fd.breadcrumb.map((b, i) => (
              <span key={b.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#d1d5db" }}>/</span>
                {i < fd.breadcrumb.length - 1
                  ? <button onClick={() => goUp(b.id)} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", padding: 0 }}>{b.name}</button>
                  : <span style={{ color: "#374151" }}>{b.name}</span>}
              </span>
            ))}
          </div>

          {/* File list */}
          <div style={{ ...card, overflow: "hidden" }}>
            {fd.files.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px", color: "#9ca3af", fontSize: "0.9rem" }}>폴더가 비어 있습니다</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f3f4f6", background: "#f9fafb" }}>
                    {["이름","크기","다운로드",""].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "0.78rem", color: "#6b7280", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fd.files.map(f => (
                    <tr key={f.id} style={{ borderBottom: "1px solid #f9fafb" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <MimeIcon mime={f.mime_type} type={f.type} size={20} />
                          {f.type === "folder"
                            ? <button onClick={() => browse(f.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#111", fontWeight: 600, fontSize: "0.9rem" }}>{f.name}</button>
                            : <span style={{ fontSize: "0.9rem", color: "#111" }}>{f.name}</span>}
                        </div>
                      </td>
                      <td style={{ padding: "10px 16px", color: "#6b7280", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                        {f.type === "folder" ? "—" : fmt(f.size)}
                      </td>
                      <td style={{ padding: "10px 16px", color: "#6b7280", fontSize: "0.85rem" }}>
                        {f.type === "file" ? f.download_count : "—"}
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right" }}>
                        {f.type === "folder"
                          ? <button onClick={() => browse(f.id)} style={{ padding: "4px 12px", border: "1px solid #e5e7eb", borderRadius: 6, background: "none", cursor: "pointer", fontSize: "0.8rem", color: "#374151" }}>열기</button>
                          : <a href={`/api/v1/drive/share/${token}?action=download&folder=${subFolder ?? ""}&file=${f.id}${pw ? `&password=${pw}` : ""}`} download={f.name}
                              style={{ padding: "4px 12px", border: "1px solid #2563eb", borderRadius: 6, background: "#2563eb", color: "#fff", textDecoration: "none", fontSize: "0.8rem" }}>
                              다운로드
                            </a>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── File view ────────────────────────────────────────────────────────────────
  const fd = data as FileMeta;
  const isImage = fd.mime_type?.startsWith("image/");
  const isPdf = fd.mime_type === "application/pdf";
  const isText = fd.mime_type?.startsWith("text/");
  const previewUrl = `/api/v1/drive/share/${token}?preview=1${pw ? `&password=${pw}` : ""}`;
  const downloadUrl2 = `/api/v1/drive/share/${token}${pw ? `?password=${pw}` : ""}`;

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px", fontFamily: "system-ui, sans-serif" }}>
      <a href="/" style={{ marginBottom: 28, fontWeight: 700, fontSize: "1.15rem", letterSpacing: "-0.03em", color: "#111", textDecoration: "none" }}>KRL<span style={{ color: "#2563eb" }}>.KR</span> <span style={{ fontWeight: 400, fontSize: "0.85rem", color: "#6b7280" }}>Drive</span></a>
      <div style={{ ...card, padding: "36px 40px", maxWidth: 560, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <MimeIcon mime={fd.mime_type} type="file" size={48} />
          <div style={{ overflow: "hidden" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320 }}>{fd.name}</h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
              {fmt(fd.size)}
              {fd.mime_type && <> · <code style={{ fontSize: "0.8rem" }}>{fd.mime_type}</code></>}
              {fd.download_count > 0 && <> · {fd.download_count}회 다운로드</>}
            </p>
          </div>
        </div>

        {isImage && (
          <div style={{ marginBottom: 24, borderRadius: 10, overflow: "hidden", border: "1px solid #e5e7eb", background: "#f3f4f6" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt={fd.name} style={{ display: "block", width: "100%", maxHeight: 340, objectFit: "contain" }} />
          </div>
        )}
        {(isPdf || isText) && (
          <div style={{ marginBottom: 24, borderRadius: 10, overflow: "hidden", border: "1px solid #e5e7eb", height: 340 }}>
            <iframe src={previewUrl} style={{ width: "100%", height: "100%", border: "none" }} title={fd.name} />
          </div>
        )}

        <a href={downloadUrl2} download={fd.name}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "13px 20px", background: "#2563eb", color: "#fff", borderRadius: 10, fontWeight: 600, fontSize: "0.9375rem", textDecoration: "none", boxSizing: "border-box" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          다운로드
        </a>
      </div>
      <p style={{ marginTop: 20, fontSize: "0.8rem", color: "#9ca3af" }}>KRL Drive로 제공됩니다 · <a href="https://krl.kr" style={{ color: "#6b7280" }}>krl.kr</a></p>
    </div>
  );
}
