-- Smart Homework database (Cloudflare D1).
-- Paste this whole file into: D1 database → Console → Execute. Safe to run more than once.
-- All times are Unix milliseconds.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  pass_hash     TEXT NOT NULL,
  pass_salt     TEXT NOT NULL,
  lang          TEXT NOT NULL DEFAULT 'th',
  trial_ends_at INTEGER,          -- NULL = has not used the free trial yet
  paid_until    INTEGER,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- One-time links for starting the free trial: /trial/<token>
CREATE TABLE IF NOT EXISTS trial_links (
  token_hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at    INTEGER,
  user_id    TEXT
);

-- id is a random URL-safe token used in /pay/<id> and /receipt/<id>
-- status: awaiting (QR shown) → submitted (user says paid) → approved / rejected
--         awaiting → expired (after 24h) or cancelled
CREATE TABLE IF NOT EXISTS payments (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_satang INTEGER NOT NULL,
  months        INTEGER NOT NULL DEFAULT 1,
  status        TEXT NOT NULL,
  note          TEXT,
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL,
  submitted_at  INTEGER,
  reviewed_at   INTEGER,
  reviewed_by   TEXT
);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status, amount_satang);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at);

CREATE TABLE IF NOT EXISTS sync_data (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
