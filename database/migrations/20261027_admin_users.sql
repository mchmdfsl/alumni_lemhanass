-- Jalankan sekali di Neon SQL Editor sebelum menggunakan Manajemen Admin.
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_users_username_unique UNIQUE (lower(username)),
  CONSTRAINT admin_users_email_unique UNIQUE (lower(email))
);

CREATE INDEX IF NOT EXISTS admin_users_active_idx ON admin_users (is_active);
