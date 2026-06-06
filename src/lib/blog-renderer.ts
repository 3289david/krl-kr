import { marked } from "marked";

// Configure marked with safe settings
marked.use({ gfm: true, breaks: true });

function e(s: string | null | undefined): string {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(ts: number | string | null): string {
  if (!ts) return "";
  return new Date(Number(ts)).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function renderMarkdown(content: string): string {
  try {
    return marked.parse(content) as string;
  } catch {
    return e(content).replace(/\n/g, "<br>");
  }
}

interface Blog {
  id: number;
  slug: string;
  title: string;
  description?: string;
  theme: string;
  primary_color: string;
  font: string;
  custom_css?: string;
  footer_text?: string;
}

interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  cover_image?: string;
  tags: string[];
  view_count: number;
  published_at?: number;
  created_at: number;
}

// ── Theme CSS ─────────────────────────────────────────────────────────────────

const FONTS: Record<string, string> = {
  system: "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  serif: "Georgia,'Times New Roman',Times,serif",
  mono: "'JetBrains Mono','Fira Code',Consolas,monospace",
  rounded: "'Nunito','Varela Round',sans-serif",
};

function themeCSS(blog: Blog): string {
  const color = e(blog.primary_color) || "#2563eb";
  const font = FONTS[blog.font] ?? FONTS.system;

  const themes: Record<string, string> = {
    default: `
      :root { --bg: #ffffff; --surface: #f8fafc; --border: #e2e8f0; --text: #0f172a; --muted: #64748b; --accent: ${color}; }
      body { background: var(--bg); color: var(--text); }
      .nav { background: var(--bg); border-bottom: 1px solid var(--border); }
    `,
    dark: `
      :root { --bg: #0f172a; --surface: #1e293b; --border: #334155; --text: #f1f5f9; --muted: #94a3b8; --accent: ${color}; }
      body { background: var(--bg); color: var(--text); }
      .nav { background: var(--surface); border-bottom: 1px solid var(--border); }
      .post-card { background: var(--surface); }
      code, pre { background: #0f172a !important; }
    `,
    minimal: `
      :root { --bg: #fafafa; --surface: #fff; --border: #ebebeb; --text: #111; --muted: #888; --accent: ${color}; }
      body { background: var(--bg); color: var(--text); }
      .nav { background: transparent; border-bottom: none; padding-bottom: 0; }
      .nav-inner { border-bottom: 2px solid var(--text); padding-bottom: 16px; }
      .post-card { background: none; border: none; border-bottom: 1px solid var(--border); border-radius: 0; padding: 24px 0; }
      .post-card:hover { box-shadow: none; transform: none; }
    `,
    paper: `
      :root { --bg: #fdf6e3; --surface: #f5e9c8; --border: #d4c4a0; --text: #3b2a1a; --muted: #8a6a4a; --accent: ${color}; }
      body { background: var(--bg); color: var(--text); }
      .nav { background: var(--surface); border-bottom: 1px solid var(--border); }
      .post-card { background: var(--surface); border-color: var(--border); }
    `,
    ocean: `
      :root { --bg: #0a1628; --surface: #0d2137; --border: #1a3a5c; --text: #e0f0ff; --muted: #7ab3d4; --accent: ${color}; }
      body { background: var(--bg); color: var(--text); }
      .nav { background: var(--surface); border-bottom: 1px solid var(--border); }
      .post-card { background: var(--surface); border-color: var(--border); }
    `,
  };

  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 16px; -webkit-text-size-adjust: 100%; }
    body { font-family: ${font}; line-height: 1.6; min-height: 100vh; display: flex; flex-direction: column; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    img { max-width: 100%; height: auto; display: block; }
    ${themes[blog.theme] ?? themes.default}
    .nav { position: sticky; top: 0; z-index: 100; }
    .nav-inner { max-width: 760px; margin: 0 auto; padding: 0 20px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
    .nav-title { font-size: 1.125rem; font-weight: 700; color: var(--text); letter-spacing: -0.02em; }
    .nav-title:hover { text-decoration: none; opacity: .8; }
    .container { max-width: 760px; margin: 0 auto; padding: 0 20px; flex: 1; }
    .hero { padding: 64px 0 48px; }
    .hero h1 { font-size: 2.25rem; font-weight: 800; letter-spacing: -0.03em; line-height: 1.2; margin-bottom: 12px; }
    .hero p { font-size: 1.0625rem; color: var(--muted); max-width: 560px; line-height: 1.65; }
    .post-grid { display: grid; gap: 20px; padding-bottom: 64px; }
    .post-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; transition: box-shadow .15s, transform .15s; }
    .post-card:hover { box-shadow: 0 4px 24px rgba(0,0,0,.08); transform: translateY(-2px); }
    .post-card:hover { text-decoration: none; }
    .card-cover { width: 100%; height: 200px; object-fit: cover; }
    .card-body { padding: 22px 24px; }
    .card-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .card-tag { font-size: 0.6875rem; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); padding: 2px 8px; border-radius: 99px; }
    .card-title { font-size: 1.25rem; font-weight: 700; color: var(--text); margin-bottom: 8px; line-height: 1.35; letter-spacing: -0.01em; }
    .card-excerpt { font-size: 0.9375rem; color: var(--muted); line-height: 1.6; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .card-meta { font-size: 0.8125rem; color: var(--muted); }
    .post-header { padding: 56px 0 32px; }
    .post-header h1 { font-size: 2.5rem; font-weight: 800; line-height: 1.2; letter-spacing: -0.03em; margin-bottom: 16px; }
    .post-meta { display: flex; align-items: center; gap: 12px; font-size: 0.875rem; color: var(--muted); }
    .post-cover { width: 100%; max-height: 480px; object-fit: cover; border-radius: 12px; margin-bottom: 40px; }
    .post-content { font-size: 1.0625rem; line-height: 1.8; padding-bottom: 64px; }
    .post-content h1,.post-content h2,.post-content h3,.post-content h4 { font-weight: 700; letter-spacing: -0.02em; margin: 1.6em 0 .6em; line-height: 1.25; color: var(--text); }
    .post-content h1 { font-size: 1.875rem; }
    .post-content h2 { font-size: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: .3em; }
    .post-content h3 { font-size: 1.25rem; }
    .post-content p { margin-bottom: 1.2em; }
    .post-content ul,.post-content ol { margin: .8em 0 1.2em 1.5em; }
    .post-content li { margin-bottom: .4em; }
    .post-content blockquote { border-left: 3px solid var(--accent); margin: 1.5em 0; padding: .8em 1em 0.8em 1.2em; background: color-mix(in srgb, var(--accent) 6%, transparent); border-radius: 0 8px 8px 0; }
    .post-content blockquote p { margin: 0; color: var(--muted); font-style: italic; }
    .post-content code { background: var(--surface); border: 1px solid var(--border); padding: 2px 6px; border-radius: 5px; font-size: .875em; font-family: 'JetBrains Mono',Consolas,monospace; }
    .post-content pre { background: #0d1117; border-radius: 10px; padding: 20px; overflow-x: auto; margin: 1.5em 0; }
    .post-content pre code { background: none; border: none; padding: 0; font-size: .875rem; color: #e6edf3; }
    .post-content table { width: 100%; border-collapse: collapse; margin: 1.5em 0; }
    .post-content th { background: var(--surface); border: 1px solid var(--border); padding: 10px 14px; font-weight: 600; text-align: left; }
    .post-content td { border: 1px solid var(--border); padding: 10px 14px; }
    .post-content tr:nth-child(even) td { background: color-mix(in srgb, var(--surface) 50%, transparent); }
    .post-content img { border-radius: 10px; margin: 1.5em auto; }
    .post-content hr { border: none; border-top: 1px solid var(--border); margin: 2.5em 0; }
    .post-tags { display: flex; gap: 8px; flex-wrap: wrap; padding: 24px 0 48px; border-top: 1px solid var(--border); margin-top: 32px; }
    .post-tag-link { font-size: 0.8125rem; font-weight: 600; color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); padding: 4px 12px; border-radius: 99px; }
    .comments { padding: 0 0 64px; }
    .comments h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 20px; }
    .comment { border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; margin-bottom: 12px; background: var(--surface); }
    .comment-meta { font-size: 0.8125rem; color: var(--muted); margin-bottom: 8px; font-weight: 600; }
    .comment-content { font-size: 0.9375rem; line-height: 1.6; }
    .comment-form { margin-top: 24px; display: flex; flex-direction: column; gap: 12px; }
    .comment-form input,.comment-form textarea { width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 0.9375rem; background: var(--surface); color: var(--text); outline: none; }
    .comment-form input:focus,.comment-form textarea:focus { border-color: var(--accent); }
    .comment-form textarea { min-height: 100px; resize: vertical; }
    .btn-submit { padding: 10px 22px; background: var(--accent); color: #fff; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; width: fit-content; }
    .btn-submit:hover { opacity: .85; }
    .empty { text-align: center; padding: 80px 24px; }
    .empty h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 8px; }
    .empty p { color: var(--muted); }
    .footer { border-top: 1px solid var(--border); padding: 24px 20px; text-align: center; font-size: 0.8125rem; color: var(--muted); }
    .breadcrumb { font-size: 0.875rem; color: var(--muted); margin-bottom: 20px; }
    .breadcrumb a { color: var(--muted); }
    @media (max-width: 600px) {
      .hero h1 { font-size: 1.75rem; }
      .post-header h1 { font-size: 1.875rem; }
      .card-body { padding: 16px; }
    }
    ${blog.custom_css ?? ""}
  `;
}

function navHtml(blog: Blog, baseUrl: string): string {
  return `<nav class="nav">
    <div class="nav-inner">
      <a href="${baseUrl}" class="nav-title">${e(blog.title)}</a>
    </div>
  </nav>`;
}

function footerHtml(blog: Blog): string {
  const text = blog.footer_text ?? `Powered by <a href="https://krl.kr" target="_blank">KRL Blog</a>`;
  return `<footer class="footer">${text}</footer>`;
}

function baseHtml(blog: Blog, title: string, description: string, body: string, baseUrl: string): string {
  const ogTitle = e(title);
  const ogDesc = e(description);
  const ogUrl = e(baseUrl);
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${ogTitle}</title>
<meta name="description" content="${ogDesc}">
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDesc}">
<meta property="og:url" content="${ogUrl}">
<meta property="og:type" content="website">
<link rel="alternate" type="application/rss+xml" title="${ogTitle}" href="${baseUrl}/rss.xml">
<style>${themeCSS(blog)}</style>
</head>
<body>
${navHtml(blog, baseUrl)}
${body}
${footerHtml(blog)}
</body>
</html>`;
}

export function renderBlogHome(blog: Blog, posts: Post[], baseUrl: string): string {
  const cards = posts.length === 0
    ? `<div class="empty"><h2>아직 글이 없습니다</h2><p>첫 번째 글을 작성해보세요.</p></div>`
    : posts.map(p => {
      const tags = (p.tags ?? []).slice(0, 3).map((t: string) => `<span class="card-tag">${e(t)}</span>`).join("");
      const excerpt = p.excerpt ?? p.content.replace(/[#*`_>\[\]!]/g, "").trim().slice(0, 160);
      return `<a href="${baseUrl}/posts/${e(p.slug)}" class="post-card" style="display:block;color:inherit;text-decoration:none;">
        ${p.cover_image ? `<img src="${e(p.cover_image)}" alt="${e(p.title)}" class="card-cover" loading="lazy">` : ""}
        <div class="card-body">
          ${tags ? `<div class="card-tags">${tags}</div>` : ""}
          <div class="card-title">${e(p.title)}</div>
          ${excerpt ? `<div class="card-excerpt">${e(excerpt)}</div>` : ""}
          <div class="card-meta">${formatDate(p.published_at ?? p.created_at)} · 조회 ${p.view_count ?? 0}</div>
        </div>
      </a>`;
    }).join("");

  const body = `
    <div class="container">
      <div class="hero">
        <h1>${e(blog.title)}</h1>
        ${blog.description ? `<p>${e(blog.description)}</p>` : ""}
      </div>
      <div class="post-grid">${cards}</div>
    </div>`;

  return baseHtml(blog, blog.title, blog.description ?? "", body, baseUrl);
}

export function renderBlogPost(blog: Blog, post: Post, comments: { author_name: string; content: string; created_at: number }[], baseUrl: string): string {
  const htmlContent = renderMarkdown(post.content);
  const tags = (post.tags ?? []).map((t: string) =>
    `<a href="${baseUrl}/tag/${encodeURIComponent(t)}" class="post-tag-link">#${e(t)}</a>`
  ).join("");

  const commentItems = comments.map(c => `
    <div class="comment">
      <div class="comment-meta">${e(c.author_name)} · ${formatDate(c.created_at)}</div>
      <div class="comment-content">${e(c.content)}</div>
    </div>`).join("");

  const body = `
    <div class="container">
      <div class="post-header">
        <p class="breadcrumb"><a href="${baseUrl}">← 목록으로</a></p>
        <h1>${e(post.title)}</h1>
        <div class="post-meta">
          <span>${formatDate(post.published_at ?? post.created_at)}</span>
          ${post.view_count ? `<span>· 조회 ${post.view_count}</span>` : ""}
        </div>
      </div>
      ${post.cover_image ? `<img src="${e(post.cover_image)}" alt="${e(post.title)}" class="post-cover">` : ""}
      <div class="post-content">${htmlContent}</div>
      ${tags ? `<div class="post-tags">${tags}</div>` : ""}
      <div class="comments">
        <h2>댓글 (${comments.length})</h2>
        ${commentItems || '<p style="color:var(--muted);margin-bottom:24px;">아직 댓글이 없습니다.</p>'}
        <form class="comment-form" onsubmit="submitComment(event)">
          <input type="text" id="c-name" placeholder="이름" required maxlength="50">
          <textarea id="c-content" placeholder="댓글을 입력하세요" required maxlength="1000"></textarea>
          <button type="submit" class="btn-submit">댓글 달기</button>
          <div id="c-msg" style="font-size:.875rem;"></div>
        </form>
      </div>
    </div>
    <script>
    async function submitComment(e) {
      e.preventDefault();
      const name = document.getElementById('c-name').value.trim();
      const content = document.getElementById('c-content').value.trim();
      const msg = document.getElementById('c-msg');
      if (!name || !content) return;
      msg.textContent = '제출 중...';
      try {
        const r = await fetch('/api/v1/blog-comment/${post.id}', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({author_name: name, content})
        });
        if (r.ok) {
          msg.style.color = 'green';
          msg.textContent = '댓글이 등록되었습니다. 승인 후 표시됩니다.';
          document.getElementById('c-name').value = '';
          document.getElementById('c-content').value = '';
        } else { msg.style.color='red'; msg.textContent='오류가 발생했습니다.'; }
      } catch { msg.style.color='red'; msg.textContent='네트워크 오류'; }
    }
    </script>`;

  const seoTitle = post.seo_title ?? `${post.title} - ${blog.title}`;
  const seoDesc = post.seo_description ?? post.excerpt ?? post.content.replace(/[#*`_>\[\]!]/g, "").trim().slice(0, 160);
  return baseHtml(blog, seoTitle, seoDesc, body, baseUrl);
}

export function renderTagPage(blog: Blog, tag: string, posts: Post[], baseUrl: string): string {
  const cards = posts.map(p => {
    const excerpt = p.excerpt ?? p.content.replace(/[#*`_>\[\]!]/g, "").trim().slice(0, 160);
    return `<a href="${baseUrl}/posts/${e(p.slug)}" class="post-card" style="display:block;color:inherit;text-decoration:none;">
      ${p.cover_image ? `<img src="${e(p.cover_image)}" alt="${e(p.title)}" class="card-cover" loading="lazy">` : ""}
      <div class="card-body">
        <div class="card-title">${e(p.title)}</div>
        ${excerpt ? `<div class="card-excerpt">${e(excerpt)}</div>` : ""}
        <div class="card-meta">${formatDate(p.published_at ?? p.created_at)}</div>
      </div>
    </a>`;
  }).join("");

  const body = `
    <div class="container">
      <div class="hero">
        <h1>${e(blog.title)}</h1>
        <p style="color:var(--muted);">#${e(tag)} 태그의 글 ${posts.length}개</p>
      </div>
      <div class="post-grid">${cards || '<div class="empty"><p>이 태그의 글이 없습니다.</p></div>'}</div>
    </div>`;

  return baseHtml(blog, `#${tag} - ${blog.title}`, "", body, baseUrl);
}

export function renderRSS(blog: Blog, posts: Post[], baseUrl: string): string {
  const items = posts.slice(0, 20).map(p => `
    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${baseUrl}/posts/${p.slug}</link>
      <pubDate>${new Date(Number(p.published_at ?? p.created_at)).toUTCString()}</pubDate>
      <description><![CDATA[${p.excerpt ?? p.content.slice(0, 300)}]]></description>
    </item>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${e(blog.title)}</title>
  <link>${baseUrl}</link>
  <description>${e(blog.description ?? "")}</description>
  <language>ko</language>
  ${items}
</channel>
</rss>`;
}

export function renderNotFound(blog: Blog, baseUrl: string): string {
  const body = `<div class="container"><div class="empty" style="padding:120px 24px;">
    <h2>페이지를 찾을 수 없습니다</h2>
    <p style="margin-top:8px;"><a href="${baseUrl}">← 홈으로 돌아가기</a></p>
  </div></div>`;
  return baseHtml(blog, `404 - ${blog.title}`, "", body, baseUrl);
}
