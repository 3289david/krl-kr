import { marked } from "marked";

marked.use({ gfm: true, breaks: true });

function e(s: string | null | undefined): string {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(ts: number | string | null): string {
  if (!ts) return "";
  return new Date(Number(ts)).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function headingToId(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function calcReadingTime(content: string): number {
  const stripped = content.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
  const words = stripped.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function stripToPlainText(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>#|]+/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function renderMarkdown(content: string): string {
  try {
    const html = marked.parse(content) as string;
    return html.replace(/<h([23])>(.*?)<\/h\1>/gi, (_, level, inner) => {
      const plain = inner.replace(/<[^>]+>/g, "");
      const id = headingToId(plain);
      return `<h${level} id="${id}">${inner}</h${level}>`;
    });
  } catch {
    return e(content).replace(/\n/g, "<br>");
  }
}

function extractTOC(content: string): { id: string; text: string; level: number }[] {
  const toc: { id: string; text: string; level: number }[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (m) {
      const level = m[1].length;
      const text = m[2].replace(/[*_`]/g, "").trim();
      toc.push({ id: headingToId(text), text, level });
    }
  }
  return toc;
}

export interface Blog {
  id: number;
  slug: string;
  title: string;
  description?: string;
  theme: string;
  primary_color: string;
  font: string;
  custom_css?: string;
  footer_text?: string;
  custom_domain?: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  cover_image?: string;
  tags: string[];
  view_count: number;
  like_count?: number;
  published_at?: number | string;
  created_at: number | string;
  seo_title?: string;
  seo_description?: string;
}

export interface NavPost { title: string; slug: string; }

const FONTS: Record<string, string> = {
  system: "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif",
  serif: "Georgia,'Times New Roman',Times,serif",
  mono: "'JetBrains Mono','Fira Code',Consolas,monospace",
  rounded: "'Nunito','Varela Round',sans-serif",
};

function themeCSS(blog: Blog): string {
  const color = e(blog.primary_color) || "#2563eb";
  const font = FONTS[blog.font] ?? FONTS.system;

  const themes: Record<string, string> = {
    default: `
      :root{--bg:#ffffff;--surface:#f8fafc;--s2:#f1f5f9;--border:#e2e8f0;--text:#0f172a;--text2:#334155;--muted:#64748b;--ac:${color};--ac-l:color-mix(in srgb,${color} 10%,transparent);--code:#0d1117;--sh:rgba(15,23,42,.07);}
      body{background:var(--bg);color:var(--text);}
      .nav{background:rgba(255,255,255,.9);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid var(--border);}
    `,
    dark: `
      :root{--bg:#0f1117;--surface:#1a1f2e;--s2:#111827;--border:#2d3748;--text:#f0f4ff;--text2:#cbd5e1;--muted:#8899aa;--ac:${color};--ac-l:color-mix(in srgb,${color} 15%,transparent);--code:#060a12;--sh:rgba(0,0,0,.5);}
      body{background:var(--bg);color:var(--text);}
      .nav{background:rgba(15,17,23,.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid var(--border);}
      .post-card,.toc,.comment{background:var(--surface);}
    `,
    minimal: `
      :root{--bg:#fafafa;--surface:#fff;--s2:#f5f5f5;--border:#e5e5e5;--text:#111;--text2:#333;--muted:#888;--ac:${color};--ac-l:color-mix(in srgb,${color} 8%,transparent);--code:#1a1a1a;--sh:rgba(0,0,0,.04);}
      body{background:var(--bg);color:var(--text);}
      .nav{background:var(--bg);border-bottom:2px solid var(--text);}
      .post-card{background:none;border:none;border-bottom:1px solid var(--border);border-radius:0;}
      .post-card:hover{box-shadow:none;transform:none;}
    `,
    paper: `
      :root{--bg:#fdf8f0;--surface:#f5ead8;--s2:#ece0c8;--border:#d4c4a0;--text:#3b2a1a;--text2:#5a3e2b;--muted:#8a6a4a;--ac:${color};--ac-l:color-mix(in srgb,${color} 10%,transparent);--code:#1e130a;--sh:rgba(59,42,26,.1);}
      body{background:var(--bg);color:var(--text);}
      .nav{background:var(--surface);border-bottom:1px solid var(--border);}
      .post-card{background:var(--surface);border-color:var(--border);}
    `,
    ocean: `
      :root{--bg:#050d1a;--surface:#0a1a30;--s2:#0d2040;--border:#1a3558;--text:#e8f4ff;--text2:#c0d8f0;--muted:#6a9fc0;--ac:${color};--ac-l:color-mix(in srgb,${color} 12%,transparent);--code:#020810;--sh:rgba(0,0,0,.6);}
      body{background:var(--bg);color:var(--text);}
      .nav{background:rgba(5,13,26,.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid var(--border);}
      .post-card,.toc,.comment{background:var(--surface);}
    `,
  };

  return `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{font-size:16px;-webkit-text-size-adjust:100%;scroll-behavior:smooth;}
    body{font-family:${font};line-height:1.65;min-height:100vh;display:flex;flex-direction:column;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
    a{color:var(--ac);text-decoration:none;}
    a:hover{text-decoration:underline;}
    img{max-width:100%;height:auto;display:block;}
    ${themes[blog.theme] ?? themes.default}

    /* Progress bar */
    #progress{position:fixed;top:0;left:0;width:0;height:3px;background:var(--ac);z-index:1000;transition:width .12s linear;pointer-events:none;border-radius:0 2px 2px 0;}

    /* Nav */
    .nav{position:sticky;top:0;z-index:100;}
    .nav-in{max-width:820px;margin:0 auto;padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between;gap:16px;}
    .nav-brand{font-size:1.125rem;font-weight:800;color:var(--text);letter-spacing:-0.02em;}
    .nav-brand:hover{text-decoration:none;opacity:.75;}
    .nav-links{display:flex;align-items:center;gap:16px;}
    .nav-link{font-size:0.875rem;color:var(--muted);font-weight:500;}
    .nav-link:hover{color:var(--text);text-decoration:none;}
    .rss-pill{font-size:0.6875rem;font-weight:800;padding:3px 9px;border-radius:5px;border:1.5px solid var(--ac);color:var(--ac);letter-spacing:.06em;}
    .rss-pill:hover{background:var(--ac);color:#fff;text-decoration:none;}

    /* Container */
    .wrap{max-width:820px;margin:0 auto;padding:0 24px;flex:1;}

    /* Home hero */
    .hero{padding:72px 0 48px;}
    .hero h1{font-size:2.625rem;font-weight:900;letter-spacing:-0.04em;line-height:1.15;margin-bottom:16px;}
    .hero p{font-size:1.125rem;color:var(--muted);max-width:560px;line-height:1.65;}

    /* Post grid */
    .pgrid{padding-bottom:80px;display:flex;flex-direction:column;gap:24px;}

    /* Featured card */
    .pfeat{display:grid;grid-template-columns:55% 45%;background:var(--surface);border:1px solid var(--border);border-radius:18px;overflow:hidden;transition:box-shadow .2s,transform .2s;color:inherit;}
    .pfeat:hover{box-shadow:0 12px 48px var(--sh);transform:translateY(-3px);text-decoration:none;}
    .pfeat-img{overflow:hidden;}
    .pfeat-img img{width:100%;height:300px;object-fit:cover;transition:transform .35s;}
    .pfeat:hover .pfeat-img img{transform:scale(1.04);}
    .pfeat-nimg{height:300px;background:linear-gradient(135deg,var(--ac-l),transparent);display:flex;align-items:center;justify-content:center;font-size:3rem;}
    .pfeat-body{padding:36px 32px;display:flex;flex-direction:column;justify-content:center;}
    .feat-label{font-size:0.6875rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ac);margin-bottom:12px;}
    .feat-title{font-size:1.625rem;font-weight:800;line-height:1.25;letter-spacing:-0.025em;color:var(--text);margin-bottom:14px;}
    .feat-exc{font-size:0.9375rem;color:var(--muted);line-height:1.65;margin-bottom:20px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
    .feat-meta{font-size:0.8125rem;color:var(--muted);display:flex;align-items:center;gap:8px;flex-wrap:wrap;}

    /* Cards grid */
    .cgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:20px;}
    .pcard{display:block;background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:box-shadow .2s,transform .2s;color:inherit;}
    .pcard:hover{box-shadow:0 8px 36px var(--sh);transform:translateY(-2px);text-decoration:none;}
    .pcard-img{overflow:hidden;}
    .pcard-img img{width:100%;height:200px;object-fit:cover;transition:transform .3s;}
    .pcard:hover .pcard-img img{transform:scale(1.04);}
    .pcard-body{padding:22px 24px;}
    .ctags{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px;}
    .ctag{font-size:0.6875rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ac);background:var(--ac-l);padding:3px 8px;border-radius:99px;}
    .ctitle{font-size:1.1875rem;font-weight:700;color:var(--text);margin-bottom:8px;line-height:1.3;letter-spacing:-0.01em;}
    .cexc{font-size:0.9375rem;color:var(--muted);line-height:1.6;margin-bottom:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
    .cmeta{font-size:0.8125rem;color:var(--muted);display:flex;align-items:center;gap:7px;}
    .dot{opacity:.35;}

    /* Post hero cover */
    .post-hero{width:100%;max-height:500px;overflow:hidden;margin-bottom:0;position:relative;}
    .post-hero img{width:100%;height:500px;object-fit:cover;display:block;}
    .post-hero-ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.6) 0%,rgba(0,0,0,.1) 55%,transparent 100%);}

    /* Post header */
    .phead{padding:52px 0 36px;}
    .phead-compact{padding:32px 0 36px;}
    .back-link{display:inline-flex;align-items:center;gap:6px;font-size:0.875rem;color:var(--muted);margin-bottom:20px;transition:color .15s;}
    .back-link:hover{color:var(--ac);text-decoration:none;}
    .post-title{font-size:2.75rem;font-weight:900;line-height:1.13;letter-spacing:-0.035em;margin-bottom:20px;color:var(--text);}
    .pmeta{display:flex;align-items:center;gap:10px;font-size:0.875rem;color:var(--muted);flex-wrap:wrap;}
    .ptags{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:18px;}
    .ptag{font-size:0.75rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ac);background:var(--ac-l);padding:4px 12px;border-radius:99px;transition:opacity .15s;}
    .ptag:hover{opacity:.7;text-decoration:none;}

    /* TOC */
    .toc{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin:0 0 40px;}
    .toc details>summary{list-style:none;padding:16px 20px;cursor:pointer;font-size:0.9375rem;font-weight:700;color:var(--text);display:flex;align-items:center;justify-content:space-between;user-select:none;}
    .toc details>summary::-webkit-details-marker{display:none;}
    .toc details>summary::after{content:"▾";font-size:.875rem;color:var(--muted);transition:transform .2s;}
    .toc details[open]>summary::after{transform:rotate(180deg);}
    .toc-list{list-style:none;padding:4px 20px 18px;display:flex;flex-direction:column;gap:4px;}
    .toc-item a{font-size:.9375rem;color:var(--muted);line-height:1.5;display:block;transition:color .15s;}
    .toc-item a:hover{color:var(--ac);text-decoration:none;}
    .toc-l3{padding-left:16px;}
    .toc-l3 a{font-size:.875rem;}

    /* Prose */
    .prose{font-size:1.0625rem;line-height:1.87;color:var(--text2);padding-bottom:40px;}
    .prose h1,.prose h2,.prose h3,.prose h4{font-weight:800;letter-spacing:-0.025em;margin:2.2em 0 .75em;line-height:1.2;color:var(--text);scroll-margin-top:80px;}
    .prose h1{font-size:2rem;}
    .prose h2{font-size:1.5rem;padding-bottom:.4em;border-bottom:1px solid var(--border);}
    .prose h3{font-size:1.25rem;}
    .prose h4{font-size:1.0625rem;}
    .prose p{margin-bottom:1.45em;}
    .prose ul,.prose ol{margin:.5em 0 1.5em 1.6em;}
    .prose li{margin-bottom:.5em;}
    .prose li p{margin-bottom:.5em;}
    .prose blockquote{border-left:4px solid var(--ac);margin:2em 0;padding:1em 1.4em;background:var(--ac-l);border-radius:0 12px 12px 0;}
    .prose blockquote p{margin:0;color:var(--muted);font-style:italic;}
    .prose code{background:var(--s2);border:1px solid var(--border);padding:2px 7px;border-radius:5px;font-size:.875em;font-family:'JetBrains Mono',Consolas,'Courier New',monospace;}
    .prose pre{border-radius:12px;overflow:hidden;margin:1.8em 0;box-shadow:0 4px 24px rgba(0,0,0,.25);position:relative;}
    .prose pre code.hljs{padding:24px 28px;font-size:.875rem;line-height:1.7;border-radius:0;border:none;background:none;}
    .copy-btn{position:absolute;top:10px;right:10px;padding:4px 10px;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:6px;font-size:.75rem;cursor:pointer;font-family:inherit;transition:background .15s;}
    .copy-btn:hover{background:rgba(255,255,255,.25);}
    .prose table{width:100%;border-collapse:collapse;margin:1.8em 0;font-size:.9375rem;border-radius:10px;overflow:hidden;border:1px solid var(--border);}
    .prose th{background:var(--s2);border-bottom:2px solid var(--border);padding:12px 16px;font-weight:700;text-align:left;color:var(--text);}
    .prose td{border-bottom:1px solid var(--border);padding:10px 16px;}
    .prose tr:last-child td{border-bottom:none;}
    .prose tr:nth-child(even) td{background:var(--surface);}
    .prose img{border-radius:12px;margin:2em auto;box-shadow:0 4px 28px var(--sh);cursor:zoom-in;}
    .prose hr{border:none;border-top:1px solid var(--border);margin:3.5em 0;}
    .prose a{color:var(--ac);text-decoration:underline;text-underline-offset:3px;}
    .prose a:hover{opacity:.8;}

    /* Share bar */
    .share{display:flex;align-items:center;gap:10px;padding:24px 0;border-top:1px solid var(--border);}
    .share-lbl{font-size:.875rem;font-weight:700;color:var(--muted);margin-right:4px;}
    .share-btn{padding:7px 18px;border-radius:99px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:.8125rem;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit;}
    .share-btn:hover{background:var(--ac);color:#fff;border-color:var(--ac);}

    /* Post footer tags */
    .ptags-foot{display:flex;gap:8px;flex-wrap:wrap;padding:20px 0 32px;}
    .ptag-link{font-size:.8125rem;font-weight:700;color:var(--ac);background:var(--ac-l);padding:5px 14px;border-radius:99px;transition:opacity .15s;}
    .ptag-link:hover{opacity:.7;text-decoration:none;}

    /* Post navigation */
    .pnav{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:0 0 48px;}
    .pnav-item{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 20px;transition:box-shadow .2s,transform .15s;color:inherit;}
    .pnav-item:hover{box-shadow:0 4px 20px var(--sh);transform:translateY(-1px);text-decoration:none;}
    .pnav-dir{font-size:.75rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-bottom:6px;display:flex;align-items:center;gap:5px;}
    .pnav-title{font-size:.9375rem;font-weight:600;color:var(--text);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
    .pnav-next{text-align:right;}

    /* Comments */
    .cmt{padding:0 0 72px;}
    .cmt h2{font-size:1.25rem;font-weight:800;margin-bottom:24px;letter-spacing:-0.02em;}
    .comment{border:1px solid var(--border);border-radius:12px;padding:18px 22px;margin-bottom:12px;background:var(--surface);}
    .cmt-meta{font-size:.8125rem;color:var(--muted);margin-bottom:8px;font-weight:700;}
    .cmt-body{font-size:.9375rem;line-height:1.65;color:var(--text2);}
    .cmt-form{margin-top:28px;display:flex;flex-direction:column;gap:12px;}
    .cmt-form input,.cmt-form textarea{width:100%;padding:12px 16px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:.9375rem;background:var(--surface);color:var(--text);outline:none;transition:border-color .15s;}
    .cmt-form input:focus,.cmt-form textarea:focus{border-color:var(--ac);}
    .cmt-form textarea{min-height:120px;resize:vertical;}
    .cmt-submit{padding:11px 26px;background:var(--ac);color:#fff;border:none;border-radius:99px;font-size:.9375rem;font-weight:700;cursor:pointer;width:fit-content;transition:opacity .15s;font-family:inherit;}
    .cmt-submit:hover{opacity:.85;}

    /* Empty state */
    .empty{text-align:center;padding:96px 24px;}
    .empty h2{font-size:1.375rem;font-weight:700;margin-bottom:10px;letter-spacing:-0.02em;}
    .empty p{color:var(--muted);}

    /* Footer */
    .footer{border-top:1px solid var(--border);padding:28px 24px;text-align:center;font-size:.8125rem;color:var(--muted);}

    /* Back to top */
    #btop{position:fixed;bottom:28px;right:28px;width:44px;height:44px;border-radius:50%;background:var(--ac);color:#fff;border:none;cursor:pointer;font-size:1.125rem;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px var(--sh);opacity:0;transition:opacity .25s,transform .25s;z-index:99;transform:translateY(12px);}
    #btop.show{opacity:1;transform:translateY(0);}
    #btop:hover{opacity:.85;}

    /* Lightbox */
    #lbox{display:none;position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:500;align-items:center;justify-content:center;cursor:zoom-out;}
    #lbox.on{display:flex;}
    #lbox img{max-width:90vw;max-height:90vh;object-fit:contain;border-radius:4px;box-shadow:0 20px 80px rgba(0,0,0,.8);}

    /* Dark mode override (visitor toggle) */
    html[data-mode='dark']{--bg:#0f1117!important;--surface:#1a1f2e!important;--s2:#111827!important;--border:#2d3748!important;--text:#f0f4ff!important;--text2:#cbd5e1!important;--muted:#8899aa!important;--code:#060a12!important;--sh:rgba(0,0,0,.5)!important;}
    html[data-mode='dark'] body{background:var(--bg)!important;color:var(--text)!important;}
    html[data-mode='dark'] .nav{background:rgba(15,17,23,.92)!important;backdrop-filter:blur(16px);}
    html[data-mode='light']{--bg:#ffffff!important;--surface:#f8fafc!important;--s2:#f1f5f9!important;--border:#e2e8f0!important;--text:#0f172a!important;--text2:#334155!important;--muted:#64748b!important;--code:#0d1117!important;--sh:rgba(15,23,42,.07)!important;}
    html[data-mode='light'] body{background:var(--bg)!important;color:var(--text)!important;}
    html[data-mode='light'] .nav{background:rgba(255,255,255,.9)!important;backdrop-filter:blur(16px);}

    /* Like button */
    .like-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 20px;border-radius:99px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:.875rem;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit;}
    .like-btn:hover{border-color:var(--ac);color:var(--ac);}
    .like-btn.liked{background:var(--ac);color:#fff;border-color:var(--ac);}
    .like-btn.liked:hover{opacity:.85;}

    /* Search */
    .search-wrap{margin-bottom:32px;}
    .search-inp{width:100%;padding:13px 18px 13px 44px;border:1.5px solid var(--border);border-radius:12px;font-family:inherit;font-size:.9375rem;background:var(--surface);color:var(--text);outline:none;transition:border-color .15s;}
    .search-inp:focus{border-color:var(--ac);}
    .search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:1rem;pointer-events:none;}
    .search-box{position:relative;}
    .no-results{text-align:center;padding:40px;color:var(--muted);font-size:.9375rem;display:none;}

    /* Dark mode toggle */
    #dm-btn{background:none;border:1.5px solid var(--border);border-radius:99px;padding:5px 12px;cursor:pointer;font-size:.875rem;color:var(--text);transition:all .15s;font-family:inherit;}
    #dm-btn:hover{border-color:var(--ac);color:var(--ac);}

    /* Responsive */
    @media(max-width:680px){
      .hero{padding:48px 0 32px;}
      .hero h1{font-size:2rem;}
      .post-title{font-size:2rem;}
      .pfeat{grid-template-columns:1fr;}
      .pfeat-img img,.pfeat-nimg{height:220px;}
      .pfeat-body{padding:24px 20px;}
      .feat-title{font-size:1.375rem;}
      .cgrid{grid-template-columns:1fr;}
      .nav-in,.wrap{padding-left:16px;padding-right:16px;}
      .post-hero img{height:300px;}
      .pnav{grid-template-columns:1fr;}
    }
    ${blog.custom_css ?? ""}
  `;
}

function navHtml(blog: Blog, baseUrl: string): string {
  return `<nav class="nav">
    <div class="nav-in">
      <a href="${baseUrl}" class="nav-brand">${e(blog.title)}</a>
      <div class="nav-links">
        <a href="${baseUrl}/rss.xml" class="rss-pill" title="RSS 피드">RSS</a>
        <button id="dm-btn" onclick="(function(){var h=document.documentElement;var cur=h.getAttribute('data-mode')||'';var sys=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';var next=cur===''?(sys==='dark'?'light':'dark'):(cur==='dark'?'light':'dark');h.setAttribute('data-mode',next);try{localStorage.setItem('krl-mode',next);}catch(e){}document.getElementById('dm-btn').textContent=next==='dark'?'밝게':'다크';})()" title="다크모드 전환">다크</button>
      </div>
    </div>
  </nav>`;
}

function footerHtml(blog: Blog): string {
  const text = blog.footer_text ?? `Powered by <a href="https://krl.kr" target="_blank" style="color:inherit;opacity:.7;text-decoration:underline">KRL Blog</a>`;
  return `<footer class="footer">${text}</footer>`;
}

function baseHtml(blog: Blog, title: string, description: string, ogImage: string, body: string, baseUrl: string, extraHead = ""): string {
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": blog.title,
    "description": blog.description ?? "",
    "url": baseUrl,
  });
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(title)}</title>
<meta name="description" content="${e(description)}">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:url" content="${e(baseUrl)}">
<meta property="og:type" content="website">
${ogImage ? `<meta property="og:image" content="${e(ogImage)}">` : ""}
<meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}">
<link rel="alternate" type="application/rss+xml" title="${e(blog.title)}" href="${baseUrl}/rss.xml">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" crossorigin="anonymous">
<script>try{var _m=localStorage.getItem('krl-mode');if(_m)document.documentElement.setAttribute('data-mode',_m);}catch(e){}</script>
${extraHead}
<script type="application/ld+json">${jsonLd}</script>
<style>${themeCSS(blog)}</style>
</head>
<body>
<div id="progress"></div>
${navHtml(blog, baseUrl)}
${body}
${footerHtml(blog)}
<button id="btop" onclick="window.scrollTo({top:0,behavior:'smooth'})" title="맨 위로">↑</button>
<div id="lbox" onclick="this.classList.remove('on')"><img id="limg" src="" alt=""></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js" crossorigin="anonymous"></script>
<script>
try{hljs.highlightAll();}catch(e){}
// Copy code buttons
document.querySelectorAll('pre').forEach(function(pre){
  var btn=document.createElement('button');
  btn.className='copy-btn';btn.textContent='복사';
  btn.addEventListener('click',function(){
    var code=pre.querySelector('code');
    if(code){
      navigator.clipboard.writeText(code.innerText).then(function(){
        btn.textContent='✓';setTimeout(function(){btn.textContent='복사';},2000);
      }).catch(function(){});
    }
  });
  pre.appendChild(btn);
});
// Image lightbox
document.querySelectorAll('.prose img').forEach(function(img){
  img.addEventListener('click',function(){
    document.getElementById('limg').src=this.src;
    document.getElementById('lbox').classList.add('on');
  });
});
// Scroll events
var bar=document.getElementById('progress'),btop=document.getElementById('btop');
window.addEventListener('scroll',function(){
  var s=document.documentElement.scrollTop||document.body.scrollTop;
  var t=document.documentElement.scrollHeight-document.documentElement.clientHeight;
  if(bar)bar.style.width=(t>0?(s/t*100):0)+'%';
  if(btop){if(s>400)btop.classList.add('show');else btop.classList.remove('show');}
},{passive:true});
</script>
</body>
</html>`;
}

export function renderBlogHome(blog: Blog, posts: Post[], baseUrl: string): string {
  let inner = "";

  if (posts.length === 0) {
    inner = `<div class="empty"><h2>아직 글이 없습니다</h2><p>첫 번째 글을 작성해보세요.</p></div>`;
  } else {
    const [feat, ...rest] = posts;
    const featExc = feat.excerpt ?? stripToPlainText(feat.content).slice(0, 200);
    const featRT = calcReadingTime(feat.content);
    const featTags = (feat.tags ?? []).slice(0, 3).map(t => `<span class="ctag">${e(t)}</span>`).join("");

    const featHtml = `
      <a href="${baseUrl}/posts/${e(feat.slug)}" class="pfeat">
        ${feat.cover_image
          ? `<div class="pfeat-img"><img src="${e(feat.cover_image)}" alt="${e(feat.title)}" loading="eager"></div>`
          : `<div class="pfeat-nimg"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.4"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div>`}
        <div class="pfeat-body">
          <div class="feat-label">추천 글</div>
          ${featTags ? `<div class="ctags">${featTags}</div>` : ""}
          <div class="feat-title">${e(feat.title)}</div>
          ${featExc ? `<div class="feat-exc">${e(featExc)}</div>` : ""}
          <div class="feat-meta">
            <span>${formatDate(feat.published_at ?? feat.created_at)}</span>
            <span class="dot">·</span><span>${featRT}분 읽기</span>
            ${(feat.view_count ?? 0) > 0 ? `<span class="dot">·</span><span>조회 ${feat.view_count}</span>` : ""}
          </div>
        </div>
      </a>`;

    const restHtml = rest.length > 0 ? `
      <div class="cgrid">
        ${rest.map(p => {
          const exc = p.excerpt ?? stripToPlainText(p.content).slice(0, 140);
          const tags = (p.tags ?? []).slice(0, 3).map(t => `<span class="ctag">${e(t)}</span>`).join("");
          const rt = calcReadingTime(p.content);
          return `<a href="${baseUrl}/posts/${e(p.slug)}" class="pcard">
            ${p.cover_image ? `<div class="pcard-img"><img src="${e(p.cover_image)}" alt="${e(p.title)}" loading="lazy"></div>` : ""}
            <div class="pcard-body">
              ${tags ? `<div class="ctags">${tags}</div>` : ""}
              <div class="ctitle">${e(p.title)}</div>
              ${exc ? `<div class="cexc">${e(exc)}</div>` : ""}
              <div class="cmeta">
                <span>${formatDate(p.published_at ?? p.created_at)}</span>
                <span class="dot">·</span><span>${rt}분 읽기</span>
              </div>
            </div>
          </a>`;
        }).join("")}
      </div>` : "";

    inner = featHtml + restHtml;
  }

  const body = `
    <div class="wrap">
      <div class="hero">
        <h1>${e(blog.title)}</h1>
        ${blog.description ? `<p>${e(blog.description)}</p>` : ""}
      </div>
      ${posts.length > 3 ? `
      <div class="search-wrap">
        <div class="search-box">
          <span class="search-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
          <input class="search-inp" type="search" id="srch" placeholder="글 검색..." oninput="doSearch(this.value)" autocomplete="off">
        </div>
        <div class="no-results" id="no-res">검색 결과가 없습니다.</div>
      </div>` : ""}
      <div class="pgrid" id="pgrid">${inner}</div>
    </div>
    <script>
    function doSearch(q){
      q=q.trim().toLowerCase();
      var items=document.querySelectorAll('#pgrid .pcard,#pgrid .pfeat');
      var vis=0;
      items.forEach(function(el){
        var txt=(el.textContent||'').toLowerCase();
        var show=!q||txt.includes(q);
        el.style.display=show?'':'none';
        if(show)vis++;
      });
      var nr=document.getElementById('no-res');
      if(nr)nr.style.display=(q&&vis===0)?'block':'none';
    }
    </script>`;

  return baseHtml(blog, blog.title, blog.description ?? "", "", body, baseUrl);
}

export function renderBlogPost(
  blog: Blog,
  post: Post,
  comments: { author_name: string; content: string; created_at: number }[],
  baseUrl: string,
  nav?: { prev?: NavPost | null; next?: NavPost | null }
): string {
  const htmlContent = renderMarkdown(post.content);
  const toc = extractTOC(post.content);
  const rt = calcReadingTime(post.content);
  const hasCover = !!post.cover_image;

  const tagChips = (post.tags ?? []).map(t =>
    `<a href="${baseUrl}/tag/${encodeURIComponent(t)}" class="ptag">#${e(t)}</a>`
  ).join("");

  const tocHtml = toc.length >= 3 ? `
    <nav class="toc">
      <details open>
        <summary>목차</summary>
        <ul class="toc-list">
          ${toc.map(h => `<li class="toc-item${h.level === 3 ? " toc-l3" : ""}"><a href="#${h.id}">${e(h.text)}</a></li>`).join("")}
        </ul>
      </details>
    </nav>` : "";

  const commentHtml = comments.map(c => `
    <div class="comment">
      <div class="cmt-meta">${e(c.author_name)} · ${formatDate(c.created_at)}</div>
      <div class="cmt-body">${e(c.content)}</div>
    </div>`).join("");

  const tagFooter = (post.tags ?? []).length > 0
    ? `<div class="ptags-foot">${(post.tags ?? []).map(t =>
        `<a href="${baseUrl}/tag/${encodeURIComponent(t)}" class="ptag-link">#${e(t)}</a>`
      ).join("")}</div>`
    : "";

  const prevNext = (nav?.prev || nav?.next) ? `
    <div class="pnav">
      ${nav?.prev ? `<a href="${baseUrl}/posts/${e(nav.prev.slug)}" class="pnav-item">
        <div class="pnav-dir">← 이전 글</div>
        <div class="pnav-title">${e(nav.prev.title)}</div>
      </a>` : `<div></div>`}
      ${nav?.next ? `<a href="${baseUrl}/posts/${e(nav.next.slug)}" class="pnav-item pnav-next">
        <div class="pnav-dir">다음 글 →</div>
        <div class="pnav-title">${e(nav.next.title)}</div>
      </a>` : `<div></div>`}
    </div>` : "";

  const seoTitle = post.seo_title ?? `${post.title} — ${blog.title}`;
  const seoDesc = post.seo_description ?? post.excerpt ?? stripToPlainText(post.content).slice(0, 160);

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": seoDesc,
    "datePublished": new Date(Number(post.published_at ?? post.created_at)).toISOString(),
    "author": { "@type": "Person", "name": blog.title },
    "publisher": { "@type": "Organization", "name": blog.title, "url": baseUrl },
    ...(post.cover_image ? { "image": post.cover_image } : {}),
    "url": `${baseUrl}/posts/${post.slug}`,
  });

  const body = `
    ${hasCover ? `<div class="post-hero"><img src="${e(post.cover_image)}" alt="${e(post.title)}" loading="eager"><div class="post-hero-ov"></div></div>` : ""}
    <div class="wrap">
      <div class="${hasCover ? "phead-compact" : "phead"}">
        <a href="${baseUrl}" class="back-link">← ${e(blog.title)}</a>
        ${tagChips ? `<div class="ptags">${tagChips}</div>` : ""}
        <h1 class="post-title">${e(post.title)}</h1>
        <div class="pmeta">
          <span>${formatDate(post.published_at ?? post.created_at)}</span>
          <span class="dot">·</span><span>${rt}분 읽기</span>
          ${(post.view_count ?? 0) > 0 ? `<span class="dot">·</span><span>조회 ${post.view_count}</span>` : ""}
        </div>
      </div>
      ${tocHtml}
      <div class="prose">${htmlContent}</div>
      <div class="share">
        <span class="share-lbl">공유</span>
        <button class="share-btn" data-t="${e(post.title)}" onclick="var b=this;if(navigator.share){navigator.share({title:b.dataset.t,url:location.href}).catch(function(){});}else{navigator.clipboard.writeText(location.href).then(function(){b.textContent='✓ 복사됨';setTimeout(function(){b.textContent='링크 복사';},2500);}).catch(function(){});}">링크 복사</button>
        <button id="like-btn" class="like-btn${post.like_count && post.like_count > 0 ? "" : ""}" data-blogid="${blog.id}" data-postid="${post.id}" onclick="doLike(this)">
          ♥ <span id="like-cnt">${post.like_count ?? 0}</span>
        </button>
      </div>
      ${tagFooter}
      ${prevNext}
      <div class="cmt">
        <h2>댓글${comments.length > 0 ? ` (${comments.length})` : ""}</h2>
        ${commentHtml || `<p style="color:var(--muted);margin-bottom:28px;font-size:.9375rem;">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</p>`}
        <form class="cmt-form" onsubmit="postCmt(event)">
          <input type="text" id="cn" placeholder="이름 *" required maxlength="50" autocomplete="name">
          <textarea id="cc" placeholder="댓글을 입력하세요 *" required maxlength="2000"></textarea>
          <button type="submit" class="cmt-submit">댓글 달기</button>
          <div id="cmsg" style="font-size:.875rem;margin-top:4px;"></div>
        </form>
      </div>
    </div>
    <script type="application/ld+json">${jsonLd}</script>
    <script>
    // Init dark mode button icon
    (function(){var m=document.documentElement.getAttribute('data-mode');var b=document.getElementById('dm-btn');if(b&&m)b.textContent=m==='dark'?'밝게':'다크';}());
    // Like button init
    (function(){
      var key='krl-liked-${post.id}';
      if(localStorage.getItem(key)){
        var btn=document.getElementById('like-btn');
        if(btn)btn.classList.add('liked');
      }
    }());
    async function doLike(btn){
      var key='krl-liked-${post.id}';
      if(localStorage.getItem(key))return;
      try{
        var r=await fetch('https://krl.kr/api/v1/blog/'+btn.dataset.blogid+'/posts/'+btn.dataset.postid+'/like',{method:'POST'});
        if(r.ok){
          var d=await r.json();
          document.getElementById('like-cnt').textContent=d.like_count;
          btn.classList.add('liked');
          localStorage.setItem(key,'1');
        }
      }catch(e){}
    }
    async function postCmt(ev){
      ev.preventDefault();
      var name=document.getElementById('cn').value.trim();
      var body=document.getElementById('cc').value.trim();
      var msg=document.getElementById('cmsg');
      if(!name||!body)return;
      msg.textContent='제출 중...';msg.style.color='var(--muted)';
      try{
        var r=await fetch('https://krl.kr/api/v1/blog-comment/${post.id}',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({author_name:name,content:body})
        });
        if(r.ok){
          msg.style.color='#16a34a';
          msg.textContent='댓글이 등록되었습니다!';
          document.getElementById('cn').value='';
          document.getElementById('cc').value='';
        } else {
          var d=await r.json();
          msg.style.color='#dc2626';
          msg.textContent=d.error||'오류가 발생했습니다.';
        }
      } catch(e){msg.style.color='#dc2626';msg.textContent='네트워크 오류가 발생했습니다.';}
    }
    </script>`;

  return baseHtml(blog, seoTitle, seoDesc, post.cover_image ?? "", body, `${baseUrl}/posts/${post.slug}`, `<script type="application/ld+json">${jsonLd}</script>`);
}

export function renderTagPage(blog: Blog, tag: string, posts: Post[], baseUrl: string): string {
  const cards = posts.map(p => {
    const exc = p.excerpt ?? stripToPlainText(p.content).slice(0, 140);
    const rt = calcReadingTime(p.content);
    return `<a href="${baseUrl}/posts/${e(p.slug)}" class="pcard">
      ${p.cover_image ? `<div class="pcard-img"><img src="${e(p.cover_image)}" alt="${e(p.title)}" loading="lazy"></div>` : ""}
      <div class="pcard-body">
        <div class="ctitle">${e(p.title)}</div>
        ${exc ? `<div class="cexc">${e(exc)}</div>` : ""}
        <div class="cmeta">
          <span>${formatDate(p.published_at ?? p.created_at)}</span>
          <span class="dot">·</span><span>${rt}분 읽기</span>
        </div>
      </div>
    </a>`;
  }).join("");

  const body = `
    <div class="wrap">
      <div class="hero">
        <h1>${e(blog.title)}</h1>
        <p style="color:var(--muted)">#${e(tag)} 태그 · 글 ${posts.length}개</p>
      </div>
      <div class="pgrid">
        ${posts.length === 0
          ? '<div class="empty"><h2>이 태그의 글이 없습니다</h2></div>'
          : `<div class="cgrid">${cards}</div>`}
      </div>
    </div>`;

  return baseHtml(blog, `#${tag} — ${blog.title}`, "", "", body, baseUrl);
}

export function renderRSS(blog: Blog, posts: Post[], baseUrl: string): string {
  const items = posts.slice(0, 20).map(p => `
    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${baseUrl}/posts/${p.slug}</link>
      <guid isPermaLink="true">${baseUrl}/posts/${p.slug}</guid>
      <pubDate>${new Date(Number(p.published_at ?? p.created_at)).toUTCString()}</pubDate>
      <description><![CDATA[${p.excerpt ?? stripToPlainText(p.content).slice(0, 300)}]]></description>
      ${(p.tags ?? []).map(t => `<category><![CDATA[${t}]]></category>`).join("")}
    </item>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${e(blog.title)}</title>
  <link>${baseUrl}</link>
  <description>${e(blog.description ?? "")}</description>
  <language>ko</language>
  <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
  ${items}
</channel>
</rss>`;
}

export function renderNotFound(blog: Blog, baseUrl: string): string {
  const body = `<div class="wrap"><div class="empty" style="padding:120px 0;">
    <h2>페이지를 찾을 수 없습니다</h2>
    <p style="margin-top:12px;color:var(--muted)"><a href="${baseUrl}">← 홈으로 돌아가기</a></p>
  </div></div>`;
  return baseHtml(blog, `404 — ${blog.title}`, "", "", body, baseUrl);
}
