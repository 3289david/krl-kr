import { notFound } from "next/navigation";
import { marked } from "marked";

interface PageProps {
  params: Promise<{ type: string; token: string }>;
  searchParams: Promise<{ page?: string }>;
}

const TYPE_LABELS: Record<string, string> = {
  note: "메모",
  doc: "문서",
  wiki: "위키",
  whiteboard: "화이트보드",
  git: "저장소",
  form: "폼",
  project: "프로젝트",
  calendar: "캘린더",
  study_goal: "학습 목표",
  box: "파일",
  space: "사이트",
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(ts: number | string | null): string {
  if (!ts) return "";
  const ms = typeof ts === "string" && /^\d+$/.test(ts) ? Number(ts) : typeof ts === "number" ? ts : new Date(ts).getTime();
  return new Date(ms).toLocaleDateString("ko-KR");
}

export default async function SharePage({ params, searchParams }: PageProps) {
  const { type, token } = await params;
  const sp = await searchParams;

  const { getPool } = await import("@/lib/db/postgres");
  const pool = getPool();

  const typeLabel = TYPE_LABELS[type] ?? "항목";

  const navHtml = `
    <nav style="background:white;border-bottom:1px solid #e2e8f0;padding:16px 24px;display:flex;align-items:center;gap:12px;">
      <a href="/" style="font-weight:800;color:#0f172a;text-decoration:none;font-size:1rem;letter-spacing:0.04em;">KRL.KR</a>
      <span style="color:#cbd5e1;">|</span>
      <span style="color:#64748b;font-size:0.875rem;">공유된 ${typeLabel}</span>
    </nav>`;

  // ---- NOTE ----
  if (type === "note") {
    const r = await pool.query("SELECT * FROM notes WHERE share_token = $1 AND is_public = TRUE", [token]);
    if (!r.rows[0]) notFound();
    const note = r.rows[0];
    const html = await marked.parse(note.content || "");
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
        <div dangerouslySetInnerHTML={{ __html: navHtml }} />
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{note.title || "제목 없음"}</h1>
          <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: 32 }}>{formatDate(note.updated_at)}</p>
          <div
            style={{ background: "white", borderRadius: 12, padding: "32px", border: "1px solid #e2e8f0", lineHeight: 1.8, color: "#334155" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </main>
      </div>
    );
  }

  // ---- DOC ----
  if (type === "doc") {
    const r = await pool.query("SELECT * FROM docs WHERE share_token = $1 AND is_public = TRUE", [token]);
    if (!r.rows[0]) notFound();
    const doc = r.rows[0];
    const html = await marked.parse(doc.content || "");
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
        <div dangerouslySetInnerHTML={{ __html: navHtml }} />
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{doc.title || "제목 없음"}</h1>
          <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: 32 }}>문서 · {formatDate(doc.updated_at)}</p>
          <div
            style={{ background: "white", borderRadius: 12, padding: "32px", border: "1px solid #e2e8f0", lineHeight: 1.8, color: "#334155" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </main>
      </div>
    );
  }

  // ---- WIKI ----
  if (type === "wiki") {
    const wikiRes = await pool.query("SELECT * FROM wikis WHERE share_token = $1 AND is_public = TRUE", [token]);
    if (!wikiRes.rows[0]) notFound();
    const wiki = wikiRes.rows[0];
    const pagesRes = await pool.query("SELECT * FROM wiki_pages WHERE wiki_id = $1 ORDER BY title", [wiki.id]);
    const pages = pagesRes.rows;
    const selectedSlug = sp.page ?? pages[0]?.slug;
    const selectedPage = pages.find((p: { slug: string }) => p.slug === selectedSlug) ?? pages[0];
    const pageHtml = selectedPage ? await marked.parse(selectedPage.content || "") : "";

    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
        <div dangerouslySetInnerHTML={{ __html: navHtml }} />
        <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto", padding: "32px 24px", gap: 24 }}>
          <aside style={{ width: 220, flexShrink: 0 }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>{wiki.name}</h2>
            {wiki.description && <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: 16 }}>{wiki.description}</p>}
            <nav>
              {pages.map((p: { slug: string; title: string }) => (
                <a
                  key={p.slug}
                  href={`?page=${p.slug}`}
                  style={{
                    display: "block", padding: "6px 12px", borderRadius: 6, marginBottom: 2,
                    fontSize: "0.875rem", textDecoration: "none",
                    background: p.slug === selectedSlug ? "#eff6ff" : "transparent",
                    color: p.slug === selectedSlug ? "#1d4ed8" : "#475569",
                    fontWeight: p.slug === selectedSlug ? 600 : 400,
                  }}
                >
                  {p.title}
                </a>
              ))}
            </nav>
          </aside>
          <main style={{ flex: 1, minWidth: 0 }}>
            {selectedPage ? (
              <>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginBottom: 24 }}>{selectedPage.title}</h1>
                <div
                  style={{ background: "white", borderRadius: 12, padding: "32px", border: "1px solid #e2e8f0", lineHeight: 1.8, color: "#334155" }}
                  dangerouslySetInnerHTML={{ __html: pageHtml }}
                />
              </>
            ) : (
              <p style={{ color: "#94a3b8" }}>페이지가 없습니다.</p>
            )}
          </main>
        </div>
      </div>
    );
  }

  // ---- WHITEBOARD ----
  if (type === "whiteboard") {
    const r = await pool.query("SELECT * FROM whiteboards WHERE share_token = $1 AND is_public = TRUE", [token]);
    if (!r.rows[0]) notFound();
    const board = r.rows[0];
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
        <div dangerouslySetInnerHTML={{ __html: navHtml }} />
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{board.name}</h1>
          <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: 32 }}>{formatDate(board.updated_at)}</p>
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            {board.thumbnail ? (
              <img src={board.thumbnail} alt={board.name} style={{ width: "100%", display: "block" }} />
            ) : (
              <div style={{ padding: "80px 32px", textAlign: "center", color: "#94a3b8" }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: 16, opacity: 0.4 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18M9 21V9"/>
                </svg>
                <p style={{ fontSize: "1rem" }}>보드 데이터 없음</p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ---- GIT ----
  if (type === "git") {
    const repoRes = await pool.query("SELECT * FROM git_repos WHERE share_token = $1 AND is_public = TRUE", [token]);
    if (!repoRes.rows[0]) notFound();
    const repo = repoRes.rows[0];
    const filesRes = await pool.query("SELECT * FROM git_files WHERE repo_id = $1 ORDER BY path", [repo.id]);
    const files = filesRes.rows;
    const selectedPath = sp.page ?? (files.find((f: { path: string }) => f.path === "README.md")?.path ?? files[0]?.path);
    const selectedFile = files.find((f: { path: string }) => f.path === selectedPath);
    const isMarkdown = selectedFile?.path?.endsWith(".md");
    const fileContent = selectedFile
      ? isMarkdown
        ? await marked.parse(selectedFile.content || "")
        : `<pre style="overflow:auto;font-size:0.875rem;line-height:1.6;">${selectedFile.content?.replace(/</g, "&lt;").replace(/>/g, "&gt;") ?? ""}</pre>`
      : "";

    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
        <div dangerouslySetInnerHTML={{ __html: navHtml }} />
        <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto", padding: "32px 24px", gap: 24 }}>
          <aside style={{ width: 220, flexShrink: 0 }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{repo.name}</h2>
            {repo.description && <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: 16 }}>{repo.description}</p>}
            <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: 8 }}>파일</p>
            {files.map((f: { path: string }) => (
              <a
                key={f.path}
                href={`?page=${encodeURIComponent(f.path)}`}
                style={{
                  display: "block", padding: "5px 10px", borderRadius: 6, marginBottom: 2,
                  fontSize: "0.8125rem", textDecoration: "none", fontFamily: "monospace",
                  background: f.path === selectedPath ? "#eff6ff" : "transparent",
                  color: f.path === selectedPath ? "#1d4ed8" : "#475569",
                }}
              >
                {f.path}
              </a>
            ))}
          </aside>
          <main style={{ flex: 1, minWidth: 0 }}>
            {selectedFile ? (
              <>
                <p style={{ fontFamily: "monospace", fontSize: "0.9375rem", color: "#0f172a", marginBottom: 16, fontWeight: 600 }}>{selectedFile.path}</p>
                <div
                  style={{ background: "white", borderRadius: 12, padding: "24px 32px", border: "1px solid #e2e8f0", lineHeight: 1.8, color: "#334155" }}
                  dangerouslySetInnerHTML={{ __html: fileContent }}
                />
              </>
            ) : (
              <p style={{ color: "#94a3b8" }}>파일이 없습니다.</p>
            )}
          </main>
        </div>
      </div>
    );
  }

  // ---- FORM ---- (redirect to /f/[id])
  if (type === "form") {
    const r = await pool.query("SELECT id FROM forms WHERE share_token = $1 AND is_public = TRUE", [token]);
    if (!r.rows[0]) notFound();
    const { redirect } = await import("next/navigation");
    redirect(`/form/${r.rows[0].id}`);
  }

  // ---- PROJECT (task_projects) ----
  if (type === "project") {
    const projRes = await pool.query("SELECT * FROM task_projects WHERE share_token = $1 AND is_public = TRUE", [token]);
    if (!projRes.rows[0]) notFound();
    const project = projRes.rows[0];
    const tasksRes = await pool.query("SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC", [project.id]);
    const tasks = tasksRes.rows;

    const statusLabel: Record<string, string> = { todo: "할 일", in_progress: "진행 중", done: "완료", cancelled: "취소" };
    const statusColor: Record<string, string> = { todo: "#64748b", in_progress: "#2563eb", done: "#16a34a", cancelled: "#dc2626" };

    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
        <div dangerouslySetInnerHTML={{ __html: navHtml }} />
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: project.color ?? "#6366f1", flexShrink: 0 }} />
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a" }}>{project.name}</h1>
          </div>
          {project.description && <p style={{ color: "#64748b", marginBottom: 24 }}>{project.description}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tasks.length === 0 ? (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: "48px 0" }}>작업이 없습니다.</p>
            ) : tasks.map((t: { id: string; title: string; status: string; due_date?: number }) => (
              <div key={t.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor[t.status] ?? "#64748b", flexShrink: 0 }} />
                <span style={{ flex: 1, color: "#0f172a", fontSize: "0.9375rem" }}>{t.title}</span>
                <span style={{ fontSize: "0.75rem", color: statusColor[t.status] ?? "#64748b", fontWeight: 600 }}>{statusLabel[t.status] ?? t.status}</span>
                {t.due_date && <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{formatDate(t.due_date)}</span>}
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ---- CALENDAR ----
  if (type === "calendar") {
    const calRes = await pool.query("SELECT * FROM calendars WHERE share_token = $1 AND is_public = TRUE", [token]);
    if (!calRes.rows[0]) notFound();
    const calendar = calRes.rows[0];
    const now = Date.now();
    const eventsRes = await pool.query(
      "SELECT * FROM calendar_events WHERE calendar_id = $1 AND end_at >= $2 ORDER BY start_at ASC LIMIT 50",
      [calendar.id, now]
    );
    const events = eventsRes.rows;

    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
        <div dangerouslySetInnerHTML={{ __html: navHtml }} />
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: calendar.color ?? "#6366f1", flexShrink: 0 }} />
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a" }}>{calendar.name}</h1>
          </div>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#64748b", marginBottom: 16 }}>예정 일정</h2>
          {events.length === 0 ? (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: "48px 0" }}>예정된 일정이 없습니다.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {events.map((e: { id: string; title: string; description?: string; location?: string; start_at: number; end_at?: number; all_day?: boolean; color?: string }) => (
                <div key={e.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 20px", borderLeft: `4px solid ${e.color ?? calendar.color ?? "#6366f1"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9375rem", marginBottom: 4 }}>{e.title}</p>
                      {e.description && <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: 4 }}>{e.description}</p>}
                      {e.location && <p style={{ fontSize: "0.8125rem", color: "#94a3b8" }}>📍 {e.location}</p>}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                      <p style={{ fontSize: "0.875rem", color: "#475569", fontWeight: 600 }}>{formatDate(e.start_at)}</p>
                      {e.all_day ? (
                        <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>종일</p>
                      ) : (
                        <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                          {new Date(e.start_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                          {e.end_at ? ` – ${new Date(e.end_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ---- STUDY GOAL ----
  if (type === "study_goal") {
    const r = await pool.query("SELECT * FROM study_goals WHERE share_token = $1 AND is_public = TRUE", [token]);
    if (!r.rows[0]) notFound();
    const goal = r.rows[0];
    const pct = goal.target_minutes > 0 ? Math.min(100, Math.round((goal.current_minutes / goal.target_minutes) * 100)) : 0;

    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
        <div dangerouslySetInnerHTML={{ __html: navHtml }} />
        <main style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px" }}>
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: "40px" }}>
            <p style={{ fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6366f1", marginBottom: 8 }}>{goal.subject}</p>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginBottom: 24 }}>{goal.title}</h1>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "#64748b", marginBottom: 8 }}>
                <span>진행률</span>
                <span>{pct}%</span>
              </div>
              <div style={{ background: "#f1f5f9", borderRadius: 99, height: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, background: goal.completed ? "#16a34a" : "#6366f1", width: `${pct}%`, transition: "width 0.3s" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 24, fontSize: "0.875rem", color: "#64748b", marginTop: 20 }}>
              <div>
                <p style={{ fontWeight: 600, color: "#0f172a" }}>{Math.round(goal.current_minutes / 60 * 10) / 10}h</p>
                <p>현재</p>
              </div>
              <div>
                <p style={{ fontWeight: 600, color: "#0f172a" }}>{Math.round(goal.target_minutes / 60 * 10) / 10}h</p>
                <p>목표</p>
              </div>
              {goal.deadline && (
                <div>
                  <p style={{ fontWeight: 600, color: "#0f172a" }}>{formatDate(goal.deadline)}</p>
                  <p>마감일</p>
                </div>
              )}
            </div>
            {goal.completed && (
              <div style={{ marginTop: 20, padding: "10px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, color: "#16a34a", fontWeight: 600, fontSize: "0.9375rem" }}>
                목표 달성!
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ---- BOX (file archive) ----
  if (type === "box") {
    const r = await pool.query("SELECT * FROM box_items WHERE share_token = $1", [token]);
    if (!r.rows[0]) notFound();
    const item = r.rows[0];

    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
        <div dangerouslySetInnerHTML={{ __html: navHtml }} />
        <main style={{ maxWidth: 480, margin: "0 auto", padding: "60px 24px" }}>
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: "40px", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginBottom: 8, wordBreak: "break-all" }}>{item.original_name}</h1>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: 24 }}>
              {formatBytes(item.file_size)} · {item.mime_type} · {formatDate(item.archived_at)}
            </p>
            {item.notes && <p style={{ color: "#64748b", fontSize: "0.9375rem", marginBottom: 24 }}>{item.notes}</p>}
            {item.file_key && (
              <a
                href={`/api/v1/drive/${item.file_key}/download`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "12px 28px", borderRadius: 10, background: "#6366f1", color: "white",
                  textDecoration: "none", fontWeight: 700, fontSize: "0.9375rem",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" x2="12" y1="3" y2="15"/>
                </svg>
                다운로드
              </a>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ---- SPACE ----
  if (type === "space") {
    const siteRes = await pool.query("SELECT * FROM space_sites WHERE share_token = $1 AND is_public = TRUE", [token]);
    if (!siteRes.rows[0]) notFound();
    const site = siteRes.rows[0];
    const pagesRes = await pool.query("SELECT * FROM space_pages WHERE site_id = $1 ORDER BY sort_order, title", [site.id]);
    const pages = pagesRes.rows;
    const selectedSlug = sp.page ?? pages[0]?.slug;
    const selectedPage = pages.find((p: { slug: string }) => p.slug === selectedSlug) ?? pages[0];
    const pageHtml = selectedPage ? await marked.parse(selectedPage.content || "") : "";

    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
        <div dangerouslySetInnerHTML={{ __html: navHtml }} />
        <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto", padding: "32px 24px", gap: 24 }}>
          <aside style={{ width: 220, flexShrink: 0 }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{site.name}</h2>
            {site.description && <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: 16 }}>{site.description}</p>}
            <nav>
              {pages.map((p: { slug: string; title: string }) => (
                <a
                  key={p.slug}
                  href={`?page=${p.slug}`}
                  style={{
                    display: "block", padding: "6px 12px", borderRadius: 6, marginBottom: 2,
                    fontSize: "0.875rem", textDecoration: "none",
                    background: p.slug === selectedSlug ? "#eff6ff" : "transparent",
                    color: p.slug === selectedSlug ? "#1d4ed8" : "#475569",
                    fontWeight: p.slug === selectedSlug ? 600 : 400,
                  }}
                >
                  {p.title}
                </a>
              ))}
            </nav>
          </aside>
          <main style={{ flex: 1, minWidth: 0 }}>
            {selectedPage ? (
              <>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginBottom: 24 }}>{selectedPage.title}</h1>
                <div
                  style={{ background: "white", borderRadius: 12, padding: "32px", border: "1px solid #e2e8f0", lineHeight: 1.8, color: "#334155" }}
                  dangerouslySetInnerHTML={{ __html: pageHtml }}
                />
              </>
            ) : (
              <p style={{ color: "#94a3b8" }}>페이지가 없습니다.</p>
            )}
          </main>
        </div>
      </div>
    );
  }

  // Unknown type
  notFound();
}
