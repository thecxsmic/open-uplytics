-- Open Uplitycs — one Postgres database for accounts, sites, ingest, and aggregates.
-- Apply with: npm run db:push

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  brand_name TEXT,
  brand_hide INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces (owner_id);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  allowed_domains TEXT NOT NULL,
  bypass_origin INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  verification_token TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  public_status INTEGER NOT NULL DEFAULT 1,
  status_slug TEXT NOT NULL UNIQUE,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sites_ws ON sites (workspace_id);

CREATE TABLE IF NOT EXISTS site_health_urls (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_health_urls_site ON site_health_urls (site_id);

CREATE TABLE IF NOT EXISTS site_notification_emails (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  email TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notify_site ON site_notification_emails (site_id);

CREATE TABLE IF NOT EXISTS alert_email_days (
  site_id TEXT NOT NULL,
  day TEXT NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (site_id, day)
);

CREATE TABLE IF NOT EXISTS hourly_buckets (
  site_id TEXT NOT NULL,
  hour_bucket BIGINT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  event_count INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (site_id, hour_bucket)
);

CREATE INDEX IF NOT EXISTS idx_hourly_buckets_pending ON hourly_buckets (processed, hour_bucket);

CREATE TABLE IF NOT EXISTS live_pings (
  site_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  last_seen BIGINT NOT NULL,
  path TEXT,
  PRIMARY KEY (site_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_live_pings_seen ON live_pings (last_seen);

CREATE TABLE IF NOT EXISTS hourly_stats (
  site_id TEXT NOT NULL,
  hour_bucket BIGINT NOT NULL,
  pageviews INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0,
  pages TEXT,
  referrers TEXT,
  devices TEXT,
  browsers TEXT,
  os TEXT,
  utm_sources TEXT,
  custom_events TEXT,
  countries TEXT,
  PRIMARY KEY (site_id, hour_bucket)
);

CREATE INDEX IF NOT EXISTS idx_hourly_stats_site_hour ON hourly_stats (site_id, hour_bucket);

CREATE TABLE IF NOT EXISTS downtimes (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  url TEXT NOT NULL,
  started_at BIGINT NOT NULL,
  ended_at BIGINT,
  last_status_code INTEGER,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_downtimes_site ON downtimes (site_id, started_at);

CREATE TABLE IF NOT EXISTS health_state (
  site_id TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL,
  last_check_at BIGINT,
  last_latency_ms INTEGER,
  last_status_code INTEGER,
  PRIMARY KEY (site_id, url)
);

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  meta TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_ws ON activity_log (workspace_id, created_at);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
  google_sub TEXT UNIQUE,
  totp_secret TEXT,
  totp_enabled INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS account_recovery_codes (
  account_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  used_at BIGINT,
  PRIMARY KEY (account_id, code_hash)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions (account_id);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT NOT NULL PRIMARY KEY,
  account_id TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_resets_account ON password_resets (account_id);

CREATE TABLE IF NOT EXISTS auth_attempts (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS cron_jobs (
  name TEXT PRIMARY KEY,
  last_started_at BIGINT,
  last_finished_at BIGINT,
  last_ok INTEGER,
  last_error TEXT,
  last_result TEXT
);
