BEGIN;

-- Keep the legacy angkatan column for backward compatibility while separating
-- the program category and cohort number in the application model.
ALTER TABLE alumni
  ADD COLUMN IF NOT EXISTS kategori_program VARCHAR(80),
  ADD COLUMN IF NOT EXISTS nomor_angkatan VARCHAR(40);

UPDATE alumni
SET kategori_program = NULLIF(UPPER(TRIM(angkatan)), '')
WHERE kategori_program IS NULL
  AND UPPER(TRIM(COALESCE(angkatan, ''))) IN (
    'KRA', 'PPRA', 'P4N', 'KSA', 'PPSA', 'P3N', 'PPNK', 'PPNK KOLABORASI', 'TOT'
  );

ALTER TABLE alumni_account_requests
  ADD COLUMN IF NOT EXISTS submitted_kategori_program VARCHAR(80),
  ADD COLUMN IF NOT EXISTS submitted_nomor_angkatan VARCHAR(40),
  ADD COLUMN IF NOT EXISTS submitted_tahun_angkatan INTEGER;

CREATE INDEX IF NOT EXISTS alumni_kategori_program_idx ON alumni(kategori_program);
CREATE INDEX IF NOT EXISTS alumni_nomor_angkatan_idx ON alumni(nomor_angkatan);
CREATE INDEX IF NOT EXISTS alumni_tahun_angkatan_idx ON alumni(tahun_angkatan);

COMMIT;
