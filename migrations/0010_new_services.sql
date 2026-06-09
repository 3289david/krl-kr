-- KRL 신규 서비스 스키마

-- 카운트다운
CREATE TABLE IF NOT EXISTS countdowns (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_at BIGINT NOT NULL,
  theme TEXT DEFAULT 'minimal',
  is_public INTEGER DEFAULT 1,
  view_count INTEGER DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_countdowns_user ON countdowns(user_id);
CREATE INDEX IF NOT EXISTS idx_countdowns_slug ON countdowns(slug);

-- 긴급 공지 배너 (Patch)
CREATE TABLE IF NOT EXISTS patches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  site_key TEXT UNIQUE NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_active INTEGER DEFAULT 0,
  cta_text TEXT,
  cta_url TEXT,
  bg_color TEXT DEFAULT '#1e40af',
  text_color TEXT DEFAULT '#ffffff',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_patches_user ON patches(user_id);
CREATE INDEX IF NOT EXISTS idx_patches_site_key ON patches(site_key);

-- 대기자 명단 (Waitlist)
CREATE TABLE IF NOT EXISTS waitlists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cta TEXT DEFAULT '사전 등록하기',
  referral_enabled INTEGER DEFAULT 0,
  is_open INTEGER DEFAULT 1,
  goal INTEGER,
  launch_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_waitlists_user ON waitlists(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlists_slug ON waitlists(slug);

CREATE TABLE IF NOT EXISTS waitlist_signups (
  id TEXT PRIMARY KEY,
  waitlist_id TEXT NOT NULL REFERENCES waitlists(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  points INTEGER DEFAULT 0,
  created_at BIGINT NOT NULL,
  UNIQUE(waitlist_id, email)
);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_waitlist ON waitlist_signups(waitlist_id);

-- 방명록 (Guestbook)
CREATE TABLE IF NOT EXISTS guestbooks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  allow_anonymous INTEGER DEFAULT 1,
  require_approval INTEGER DEFAULT 0,
  theme TEXT DEFAULT 'light',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_guestbooks_user ON guestbooks(user_id);
CREATE INDEX IF NOT EXISTS idx_guestbooks_slug ON guestbooks(slug);

CREATE TABLE IF NOT EXISTS guestbook_entries (
  id TEXT PRIMARY KEY,
  guestbook_id TEXT NOT NULL REFERENCES guestbooks(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email TEXT,
  content TEXT NOT NULL,
  is_approved INTEGER DEFAULT 1,
  ip TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_guestbook_entries_guestbook ON guestbook_entries(guestbook_id);
CREATE INDEX IF NOT EXISTS idx_guestbook_entries_created ON guestbook_entries(created_at DESC);

-- 런치패드 (Launchpad)
CREATE TABLE IF NOT EXISTS launchpad_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  status TEXT DEFAULT 'building',
  website_url TEXT,
  github_url TEXT,
  twitter_url TEXT,
  logo_text TEXT,
  accent_color TEXT DEFAULT '#6366f1',
  is_public INTEGER DEFAULT 1,
  contact_email TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_launchpad_user ON launchpad_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_launchpad_slug ON launchpad_projects(slug);

CREATE TABLE IF NOT EXISTS launchpad_changelog (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES launchpad_projects(id) ON DELETE CASCADE,
  version TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_launchpad_changelog_project ON launchpad_changelog(project_id);

CREATE TABLE IF NOT EXISTS launchpad_feedback (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES launchpad_projects(id) ON DELETE CASCADE,
  author_name TEXT,
  author_email TEXT,
  type TEXT DEFAULT 'general',
  content TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_launchpad_feedback_project ON launchpad_feedback(project_id);
