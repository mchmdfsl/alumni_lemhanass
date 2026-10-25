BEGIN;

ALTER TABLE alumni_account_requests
  ADD COLUMN IF NOT EXISTS submitted_nama VARCHAR(200),
  ADD COLUMN IF NOT EXISTS submitted_angkatan VARCHAR(100),
  ADD COLUMN IF NOT EXISTS submitted_nomor_hp VARCHAR(50),
  ADD COLUMN IF NOT EXISTS submitted_nomor_alumni VARCHAR(80),
  ADD COLUMN IF NOT EXISTS submitted_instansi VARCHAR(250),
  ADD COLUMN IF NOT EXISTS submitted_jabatan VARCHAR(200),
  ADD COLUMN IF NOT EXISTS submitted_wilayah VARCHAR(150),
  ADD COLUMN IF NOT EXISTS submitted_alamat TEXT;

CREATE INDEX IF NOT EXISTS alumni_account_requests_email_pending_idx
  ON alumni_account_requests (LOWER(email), status);

COMMIT;
