import { notFound } from "next/navigation";
import { getDB } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import HlsPlayer from "@/components/HlsPlayer";

/** Safely convert any date value (number, numeric string, ISO string) to ms */
function toMs(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return isNaN(v) ? null : v;
  if (typeof v === "string") {
    const s = v.trim();
    if (/^\d+$/.test(s)) return Number(s);
    const t = new Date(s).getTime();
    return isNaN(t) ? null : t;
  }
  return null;
}

interface FileRecord {
  id: string;
  slug: string;
  original_name: string;
  mime_type: string;
  size: number;
  download_count: number;
  max_downloads: number | null;
  expires_at: string | null;
  created_at: string;
  password_hash: string | null;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mime: string) {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("zip") || mime.includes("tar") || mime.includes("gzip")) return "archive";
  if (mime.includes("text") || mime.includes("json") || mime.includes("xml")) return "text";
  return "file";
}

const FILE_ICON_PATHS: Record<string, string> = {
  image: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5-5 5 5m-5-5v12",
  video: "m22 8-6-6H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM2 12h20",
  audio: "M9 18V5l12-2v13M6 15H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1zM18 13h-3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1z",
  pdf: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2zM14 2v6h6",
  archive: "M21 8v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8m18 0H3m18 0-2-5H5L3 8m9 4v4m0 0-2-2m2 2 2-2",
  text: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  file: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2zM14 2v6h6",
};

export default async function FileDownloadPage({ params }: PageProps) {
  const { slug } = await params;

  const db = getDB();
  if (!db) {
    return (
      <main>
        <section className="section">
          <div className="container" style={{ maxWidth: "480px", textAlign: "center" }}>
            <p style={{ color: "var(--color-danger)" }}>서비스를 일시적으로 사용할 수 없습니다.</p>
          </div>
        </section>
      </main>
    );
  }

  const file = await db.prepare("SELECT * FROM files WHERE slug = ?").bind(slug).first<FileRecord>();
  if (!file) notFound();

  // Check expiry — handle both numeric ms and ISO string values from D1
  const expiresMs = toMs(file.expires_at);
  if (expiresMs && expiresMs < Date.now()) {
    return (
      <main>
        <section className="section">
          <div className="container" style={{ maxWidth: "480px", textAlign: "center" }}>
            <h1 style={{ marginBottom: "16px" }}>만료된 파일</h1>
            <p style={{ color: "var(--color-muted)" }}>이 파일 링크는 만료되었습니다.</p>
          </div>
        </section>
      </main>
    );
  }

  // Check download limit
  if (file.max_downloads !== null && file.download_count >= file.max_downloads) {
    return (
      <main>
        <section className="section">
          <div className="container" style={{ maxWidth: "480px", textAlign: "center" }}>
            <h1 style={{ marginBottom: "16px" }}>다운로드 한도 초과</h1>
            <p style={{ color: "var(--color-muted)" }}>이 파일의 최대 다운로드 횟수에 도달했습니다.</p>
          </div>
        </section>
      </main>
    );
  }

  const iconType = getFileIcon(file.mime_type);
  const iconPath = FILE_ICON_PATHS[iconType];
  const isMedia = iconType === "video" || iconType === "image" || iconType === "audio";
  const hasPassword = !!file.password_hash;
  const maxWidth = isMedia ? "min(96vw, 860px)" : "480px";

  return (
    <main>
      <section className="section">
        <div className="container" style={{ maxWidth }}>
          <div style={{ textAlign: "center", padding: isMedia ? "24px" : "48px 32px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)" }}>

            {/* Inline media player — hidden for password-protected files */}
            {iconType === "video" && !hasPassword && (
              <div style={{ marginBottom: "20px", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "#000" }}>
                <HlsPlayer
                  src={`/api/v1/files/${slug}?preview=1`}
                  hlsSrc={`/api/v1/hls/pub/${slug}/playlist.m3u8`}
                  style={{ maxHeight: "520px", width: "100%" }}
                />
              </div>
            )}

            {iconType === "image" && !hasPassword && (
              <div style={{ marginBottom: "20px", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                <img
                  src={`/api/v1/files/${slug}?preview=1`}
                  alt={file.original_name}
                  style={{ maxWidth: "100%", maxHeight: "520px", objectFit: "contain", display: "block", margin: "0 auto" }}
                />
              </div>
            )}

            {iconType === "audio" && !hasPassword && (
              <div style={{ padding: "16px 0 8px" }}>
                <audio controls src={`/api/v1/files/${slug}?preview=1`} style={{ width: "100%" }} />
              </div>
            )}

            {/* Show icon only for non-media or password-protected files */}
            {(!isMedia || hasPassword) && (
              <div style={{ width: "72px", height: "72px", borderRadius: "var(--radius-xl)", background: "var(--color-surface-card)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={iconPath} />
                </svg>
              </div>
            )}

            <h1 style={{ fontSize: "1.25rem", marginBottom: "8px", wordBreak: "break-all", marginTop: isMedia && !hasPassword ? "8px" : undefined }}>
              {file.original_name}
            </h1>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{formatBytes(file.size)}</span>
              <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{file.mime_type}</span>
              <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>다운로드 {file.download_count}회</span>
            </div>

            {expiresMs && (
              <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "20px" }}>
                만료일: {formatDate(expiresMs)}
              </p>
            )}

            <a
              href={`/api/v1/files/${slug}`}
              className="btn btn-primary btn-lg btn-pill"
              style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "center" }}
              download={file.original_name}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
              다운로드
            </a>

            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", marginTop: "20px" }}>
              생성일: {formatDate(file.created_at)}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
