BEGIN;

-- Pastikan tabel token reset tersedia meskipun database dibuat dari schema.sql
-- dan bukan dari migration 001.
CREATE TABLE IF NOT EXISTS alumni_password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL
    REFERENCES alumni_accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS alumni_password_reset_account_idx
  ON alumni_password_reset_tokens(account_id);

COMMIT;
