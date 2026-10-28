-- Extend only the staging table for the current alumni CSV format.
-- This does not modify public.alumni or any account/history tables.
ALTER TABLE public.alumni_import_staging
  ADD COLUMN IF NOT EXISTS kategori_program VARCHAR(80),
  ADD COLUMN IF NOT EXISTS nomor_angkatan INTEGER;
