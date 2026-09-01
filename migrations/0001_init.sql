-- Core schema for Startup Board

CREATE TABLE IF NOT EXISTS territories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  price_pence INTEGER NOT NULL,
  colour TEXT NOT NULL DEFAULT '#6366f1',
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'pending', 'sold')),
  owner_name TEXT,
  company_name TEXT,
  owner_description TEXT,
  website_url TEXT,
  logo_url TEXT,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  pending_until TEXT,
  purchased_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_territories_slug ON territories(slug);
CREATE INDEX IF NOT EXISTS idx_territories_status ON territories(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_territories_checkout_session
  ON territories(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS stripe_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(bucket_key, window_start)
);
