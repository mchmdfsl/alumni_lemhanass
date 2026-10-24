BEGIN;

-- Akun login alumni dipisahkan dari data profil alumni.
CREATE TABLE IF NOT EXISTS alumni_accounts (
  id BIGSERIAL PRIMARY KEY,
  alumni_id BIGINT NOT NULL UNIQUE
    REFERENCES alumni(id) ON DELETE CASCADE,
  email VARCHAR(254) NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT alumni_accounts_email_not_blank
    CHECK (length(trim(email)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS alumni_accounts_email_lower_uq
  ON alumni_accounts (lower(email));

-- Registrasi dan klaim akun yang belum dapat diverifikasi otomatis.
CREATE TABLE IF NOT EXISTS alumni_account_requests (
  id BIGSERIAL PRIMARY KEY,
  alumni_id BIGINT
    REFERENCES alumni(id) ON DELETE SET NULL,
  email VARCHAR(254) NOT NULL,
  request_type VARCHAR(20) NOT NULL
    CHECK (request_type IN ('register', 'claim')),
  status VARCHAR(20) NOT NULL DEFAULT 'Menunggu'
    CHECK (status IN ('Menunggu', 'Disetujui', 'Ditolak')),
  review_note TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS alumni_account_requests_status_idx
  ON alumni_account_requests(status, created_at DESC);

-- Token reset disimpan sebagai hash, bukan token mentah.
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
