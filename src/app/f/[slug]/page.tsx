import { notFound } from "next/navigation";
import { getDB } from "@/lib/env";

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

  // Check expiry
  if (file.expires_at && new Date(file.expires_at) < new Date()) {
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

  return (
    <main>
      <section className="section">
        <div className="container" style={{ maxWidth: "480px" }}>
          <div style={{ textAlign: "center", padding: "48px 32px", background: "var(--color-lifted)", border: "1px solid var(--color-hairline)", borderRadius: "var(--radius-xl)" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "var(--radius-xl)", background: "var(--color-surface-card)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={iconPath} />
              </svg>
            </div>

            <h1 style={{ fontSize: "1.375rem", marginBottom: "8px", wordBreak: "break-all" }}>
              {file.original_name}
            </h1>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "32px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{formatBytes(file.size)}</span>
              <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>{file.mime_type}</span>
              <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>다운로드 {file.download_count}회</span>
            </div>

            {file.expires_at && (
              <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginBottom: "20px" }}>
                만료일: {new Date(file.expires_at).toLocaleDateString("ko-KR")}
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
              생성일: {new Date(file.created_at).toLocaleDateString("ko-KR")}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
