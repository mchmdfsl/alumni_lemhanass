-- Normalize legacy cohort strings without deleting or overwriting valid separated values.
-- Examples: "PPSA 22" -> kategori_program="PPSA", nomor_angkatan="22".
-- Optional trailing four-digit year is copied to tahun_angkatan only when that field is empty.
BEGIN;

WITH parsed AS (
  SELECT
    id,
    (regexp_match(
      upper(trim(coalesce(angkatan, ''))),
      '^(PPNK KOLABORASI|KRA|PPRA|P4N|KSA|PPSA|P3N|PPNK|TOT)[[:space:]]+([0-9]+)([[:space:]]+([0-9]{4}))?$'
    )) AS parts
  FROM public.alumni
  WHERE NULLIF(trim(coalesce(angkatan, '')), '') IS NOT NULL
)
UPDATE public.alumni AS a
SET
  kategori_program = CASE
    WHEN a.kategori_program IS NULL OR trim(a.kategori_program) = '' OR upper(trim(a.kategori_program)) = upper(trim(a.angkatan))
      THEN parsed.parts[1]
    ELSE a.kategori_program
  END,
  nomor_angkatan = CASE
    WHEN a.nomor_angkatan IS NULL OR trim(a.nomor_angkatan) = ''
      THEN parsed.parts[2]
    ELSE a.nomor_angkatan
  END,
  tahun_angkatan = CASE
    WHEN a.tahun_angkatan IS NULL AND parsed.parts[4] IS NOT NULL
      THEN parsed.parts[4]::integer
    ELSE a.tahun_angkatan
  END,
  updated_at = NOW()
FROM parsed
WHERE a.id = parsed.id
  AND parsed.parts IS NOT NULL;

-- Rows whose legacy value is exactly an official category can be normalized safely too.
UPDATE public.alumni
SET kategori_program = upper(trim(angkatan)),
    updated_at = NOW()
WHERE (kategori_program IS NULL OR trim(kategori_program) = '')
  AND upper(trim(coalesce(angkatan, ''))) IN
    ('KRA', 'PPRA', 'P4N', 'KSA', 'PPSA', 'P3N', 'PPNK', 'PPNK KOLABORASI', 'TOT');

COMMIT;
