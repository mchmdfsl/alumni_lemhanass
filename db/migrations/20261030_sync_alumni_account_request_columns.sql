-- Align alumni account request columns with the registration/review APIs.
-- Safe to run more than once; existing rows and values are preserved.
BEGIN;

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

COMMIT;
