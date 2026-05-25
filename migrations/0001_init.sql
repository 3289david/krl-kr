-- KRL.KR Database Schema
-- Cloudflare D1 (SQLite)
-- Migration: 0001_init

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  password_hash TEXT,
  plan        TEXT NOT NULL DEFAULT 'free',  -- free | pro | business
  api_key     TEXT UNIQUE,
  avatar_url  TEXT,
  verified    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_api_key ON users(api_key);

-- ─── Links ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS links (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  original_url    TEXT NOT NULL,
  user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,

  -- Metadata
  title           TEXT,
  description     TEXT,
  og_image        TEXT,

  -- Access control
  password_hash   TEXT,
  is_active       INTEGER NOT NULL DEFAULT 1,

  -- Expiry
  expires_at      INTEGER,          -- UNIX timestamp
  max_clicks      INTEGER,          -- NULL = unlimited

  -- Counters
  click_count     INTEGER NOT NULL DEFAULT 0,
  unique_count    INTEGER NOT NULL DEFAULT 0,

  -- Dynamic link
  is_dynamic      INTEGER NOT NULL DEFAULT 0,

  -- App links
  ios_url         TEXT,
  android_url     TEXT,
  fallback_url    TEXT,

  -- Geo redirect rules (JSON: [{country: "KR", url: "..."}])
  geo_rules       TEXT,

  -- Device redirect rules (JSON: [{device: "mobile", url: "..."}])
  device_rules    TEXT,

  -- UTM params (JSON)
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,

  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE INDEX idx_links_slug ON links(slug);
CREATE INDEX idx_links_user_id ON links(user_id);
CREATE INDEX idx_links_created_at ON links(created_at DESC);

-- ─── Clicks (Analytics) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clicks (
  id          TEXT PRIMARY KEY,
  link_id     TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at  INTEGER NOT NULL,

  -- Location (from Cloudflare CF-* headers)
  country     TEXT,   -- ISO 3166-1 alpha-2
  city        TEXT,
  region      TEXT,
  latitude    REAL,
  longitude   REAL,

  -- Device
  device_type TEXT,   -- mobile | desktop | tablet | bot
  browser     TEXT,
  browser_version TEXT,
  os          TEXT,
  os_version  TEXT,

  -- Traffic source
  referer     TEXT,
  referer_domain TEXT,

  -- Raw (for debugging, truncated)
  user_agent  TEXT,
  ip_hash     TEXT    -- MD5(IP) for uniqueness, not stored raw
);

CREATE INDEX idx_clicks_link_id ON clicks(link_id);
CREATE INDEX idx_clicks_clicked_at ON clicks(clicked_at DESC);
CREATE INDEX idx_clicks_country ON clicks(country);

-- ─── QR Codes ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_codes (
  id          TEXT PRIMARY KEY,
  link_id     TEXT REFERENCES links(id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,

  -- Style config (JSON)
  style       TEXT NOT NULL DEFAULT '{}',
  logo_url    TEXT,
  r2_key      TEXT,   -- stored PNG/SVG in R2

  scan_count  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE INDEX idx_qr_codes_link_id ON qr_codes(link_id);

-- ─── Files (File Drop) ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
  id              TEXT PRIMARY KEY,
  user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
  slug            TEXT UNIQUE,
  original_name   TEXT NOT NULL,
  r2_key          TEXT NOT NULL,
  size            INTEGER NOT NULL,
  mime_type       TEXT,
  password_hash   TEXT,
  expires_at      INTEGER,
  max_downloads   INTEGER,
  download_count  INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL
);

CREATE INDEX idx_files_slug ON files(slug);
CREATE INDEX idx_files_user_id ON files(user_id);

-- ─── Pastes (Pastebin) ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pastes (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT,
  content       TEXT NOT NULL,
  language      TEXT DEFAULT 'plaintext',
  password_hash TEXT,
  expires_at    INTEGER,
  is_public     INTEGER NOT NULL DEFAULT 1,
  view_count    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);

CREATE INDEX idx_pastes_slug ON pastes(slug);
CREATE INDEX idx_pastes_user_id ON pastes(user_id);

-- ─── API Keys ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  key_hash    TEXT UNIQUE NOT NULL,
  key_prefix  TEXT NOT NULL,  -- first 8 chars for display
  scopes      TEXT NOT NULL DEFAULT '["links:read","links:write"]',  -- JSON array
  last_used_at INTEGER,
  expires_at  INTEGER,
  created_at  INTEGER NOT NULL
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

-- ─── Subdomains ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subdomains (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subdomain   TEXT UNIQUE NOT NULL,
  type        TEXT NOT NULL,  -- github | vercel | html | redirect | api
  target      TEXT NOT NULL,  -- URL or config JSON
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL
);

CREATE INDEX idx_subdomains_subdomain ON subdomains(subdomain);
CREATE INDEX idx_subdomains_user_id ON subdomains(user_id);

-- ─── Link-in-bio Pages ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bio_pages (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,  -- @username
  display_name TEXT,
  bio         TEXT,
  avatar_url  TEXT,
  theme       TEXT NOT NULL DEFAULT 'default',
  links       TEXT NOT NULL DEFAULT '[]',  -- JSON array of link objects
  social      TEXT NOT NULL DEFAULT '{}',  -- JSON social links
  is_active   INTEGER NOT NULL DEFAULT 1,
  view_count  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX idx_bio_pages_username ON bio_pages(username);
CREATE INDEX idx_bio_pages_user_id ON bio_pages(user_id);

-- ─── Webhook Inspections ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_inspections (
  id          TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL,
  method      TEXT NOT NULL,
  headers     TEXT NOT NULL DEFAULT '{}',
  body        TEXT,
  query       TEXT,
  ip          TEXT,
  received_at INTEGER NOT NULL
);

CREATE INDEX idx_webhook_inspections_endpoint ON webhook_inspections(endpoint_id);

-- ─── Webhook Endpoints ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  slug        TEXT UNIQUE NOT NULL,
  label       TEXT,
  expires_at  INTEGER,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE INDEX idx_webhook_endpoints_slug ON webhook_endpoints(slug);

-- ─── Sessions ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT UNIQUE NOT NULL,
  expires_at  INTEGER NOT NULL,
  ip          TEXT,
  user_agent  TEXT,
  created_at  INTEGER NOT NULL
);

CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- ─── Email Verifications ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_verifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);

-- ─── Password Resets ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT UNIQUE NOT NULL,
  expires_at  INTEGER NOT NULL,
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
