-- Additive synchronization for the lemhanas neww Neon database.
-- Safe to re-run: only adds missing columns, indexes, and tables.
-- Does not delete or rewrite existing alumni records.

ALTER TABLE public.alumni_account_requests
  ADD COLUMN IF NOT EXISTS submitted_nama VARCHAR(200),
  ADD COLUMN IF NOT EXISTS submitted_angkatan VARCHAR(100),
  ADD COLUMN IF NOT EXISTS submitted_kategori_program VARCHAR(80),
  ADD COLUMN IF NOT EXISTS submitted_nomor_angkatan VARCHAR(40),
  ADD COLUMN IF NOT EXISTS submitted_tahun_angkatan INTEGER,
  ADD COLUMN IF NOT EXISTS submitted_nomor_hp VARCHAR(50),
  ADD COLUMN IF NOT EXISTS submitted_nomor_alumni VARCHAR(80),
  ADD COLUMN IF NOT EXISTS submitted_instansi VARCHAR(250),
  ADD COLUMN IF NOT EXISTS submitted_jabatan VARCHAR(200),
  ADD COLUMN IF NOT EXISTS submitted_wilayah VARCHAR(150),
  ADD COLUMN IF NOT EXISTS submitted_alamat TEXT;

CREATE INDEX IF NOT EXISTS alumni_account_requests_status_type_idx
  ON public.alumni_account_requests(status, request_type);

ALTER TABLE public.alumni
  ADD COLUMN IF NOT EXISTS ktm_verification_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS alumni_ktm_verification_token_uidx
  ON public.alumni (ktm_verification_token);

CREATE TABLE IF NOT EXISTS public.ktm_signature_settings (
  id BIGSERIAL PRIMARY KEY,
  kategori_program TEXT NOT NULL UNIQUE,
  nama_deputi TEXT NOT NULL DEFAULT '',
  jabatan_deputi TEXT NOT NULL DEFAULT 'Deputi',
  signature_url TEXT,
  format_ttd TEXT NOT NULL DEFAULT 'standard'
    CHECK (format_ttd IN ('standard', 'tot_white')),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ktm_signature_settings_category
  ON public.ktm_signature_settings (kategori_program);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin', 'super_admin')),
  kategori_program VARCHAR(80),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_username_lower_unique
  ON public.admin_users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_lower_unique
  ON public.admin_users (lower(email));
CREATE INDEX IF NOT EXISTS admin_users_active_idx
  ON public.admin_users (is_active);
CREATE INDEX IF NOT EXISTS admin_users_category_active_idx
  ON public.admin_users (UPPER(TRIM(kategori_program)))
  WHERE is_active = TRUE AND role = 'admin';


-- Bulk activation creates login accounts before an email is supplied.
-- Existing email values are preserved; only the restrictive null/blank rules are relaxed.
ALTER TABLE public.alumni_accounts ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.alumni_accounts DROP CONSTRAINT IF EXISTS alumni_accounts_email_not_blank;

-- Keep the alumni self-service account-deletion request feature available.
CREATE TABLE IF NOT EXISTS public.alumni_user_requests (
  id BIGSERIAL PRIMARY KEY,
  alumni_id BIGINT NOT NULL REFERENCES public.alumni(id) ON DELETE CASCADE,
  request_type VARCHAR(30) NOT NULL
    CHECK (request_type IN ('profile_update', 'data_update', 'delete_account')),
  payload JSONB,
  message TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'Menunggu'
    CHECK (status IN ('Menunggu', 'Disetujui', 'Ditolak')),
  admin_note TEXT,
  reviewed_by VARCHAR(254),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS alumni_user_requests_owner_idx
  ON public.alumni_user_requests (alumni_id, created_at DESC);
CREATE INDEX IF NOT EXISTS alumni_user_requests_status_idx
  ON public.alumni_user_requests (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.app_schema_migrations (
  migration_name VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_schema_migrations (migration_name)
VALUES ('20261108_neon_neww_additive_sync.sql')
ON CONFLICT (migration_name) DO NOTHING;
