-- Jalankan sekali di Neon SQL Editor sebelum memakai fitur Log Aktivitas.
-- Aman dijalankan ulang pada database yang sudah memiliki tabel log.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  action VARCHAR(80) NOT NULL,
  alumni_id BIGINT REFERENCES alumni(id) ON DELETE SET NULL,
  actor VARCHAR(254) NOT NULL DEFAULT 'admin',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_audit_log
  ADD COLUMN IF NOT EXISTS actor VARCHAR(254) NOT NULL DEFAULT 'admin';

ALTER TABLE admin_audit_log
  ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE admin_audit_log
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx
  ON admin_audit_log (created_at DESC, id DESC);
