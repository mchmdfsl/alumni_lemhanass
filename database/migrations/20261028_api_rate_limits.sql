-- Jalankan sekali di Neon SQL Editor sebelum rate limiter diaktifkan.
-- Menyimpan hash kunci saja; IP/email asli tidak disimpan di tabel ini.
CREATE TABLE IF NOT EXISTS api_rate_limits (
  key_hash CHAR(64) PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0)
);

CREATE INDEX IF NOT EXISTS api_rate_limits_window_started_at_idx
  ON api_rate_limits (window_started_at);
