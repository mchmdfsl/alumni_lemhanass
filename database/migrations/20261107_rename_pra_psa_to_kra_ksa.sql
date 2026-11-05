BEGIN;

-- Satukan kategori lama ke nama kategori resmi yang baru.
UPDATE public.alumni
SET kategori_program = CASE
  WHEN upper(trim(kategori_program)) = 'PRA' THEN 'KRA'
  WHEN upper(trim(kategori_program)) = 'PSA' THEN 'KSA'
  WHEN upper(trim(kategori_program)) ~ '^PRA[[:space:]]' THEN regexp_replace(upper(trim(kategori_program)), '^PRA', 'KRA')
  WHEN upper(trim(kategori_program)) ~ '^PSA[[:space:]]' THEN regexp_replace(upper(trim(kategori_program)), '^PSA', 'KSA')
  ELSE kategori_program
END,
angkatan = CASE
  WHEN upper(trim(angkatan)) ~ '^PRA([[:space:]]|$)' THEN regexp_replace(angkatan, '^PRA', 'KRA', 'i')
  WHEN upper(trim(angkatan)) ~ '^PSA([[:space:]]|$)' THEN regexp_replace(angkatan, '^PSA', 'KSA', 'i')
  ELSE angkatan
END,
updated_at = NOW()
WHERE upper(trim(coalesce(kategori_program, ''))) IN ('PRA', 'PSA')
   OR upper(trim(coalesce(kategori_program, ''))) ~ '^(PRA|PSA)[[:space:]]'
   OR upper(trim(coalesce(angkatan, ''))) ~ '^(PRA|PSA)([[:space:]]|$)';

-- Selaraskan pendaftaran yang masih menunggu agar tidak menyimpan label lama.
UPDATE public.alumni_account_requests
SET submitted_kategori_program = CASE
      WHEN upper(trim(coalesce(submitted_kategori_program, ''))) = 'PRA' THEN 'KRA'
      WHEN upper(trim(coalesce(submitted_kategori_program, ''))) = 'PSA' THEN 'KSA'
      ELSE submitted_kategori_program
    END,
    submitted_angkatan = CASE
      WHEN upper(trim(coalesce(submitted_angkatan, ''))) ~ '^PRA([[:space:]]|$)' THEN regexp_replace(submitted_angkatan, '^PRA', 'KRA', 'i')
      WHEN upper(trim(coalesce(submitted_angkatan, ''))) ~ '^PSA([[:space:]]|$)' THEN regexp_replace(submitted_angkatan, '^PSA', 'KSA', 'i')
      ELSE submitted_angkatan
    END
WHERE upper(trim(coalesce(submitted_kategori_program, ''))) IN ('PRA', 'PSA')
   OR upper(trim(coalesce(submitted_angkatan, ''))) ~ '^(PRA|PSA)([[:space:]]|$)';

-- Data staging juga dinormalisasi agar proses impor berikutnya konsisten.
UPDATE public.alumni_import_staging
SET kategori_program = CASE
      WHEN upper(trim(coalesce(kategori_program, ''))) = 'PRA' THEN 'KRA'
      WHEN upper(trim(coalesce(kategori_program, ''))) = 'PSA' THEN 'KSA'
      ELSE kategori_program
    END,
    angkatan = CASE
      WHEN upper(trim(coalesce(angkatan, ''))) ~ '^PRA([[:space:]]|$)' THEN regexp_replace(angkatan, '^PRA', 'KRA', 'i')
      WHEN upper(trim(coalesce(angkatan, ''))) ~ '^PSA([[:space:]]|$)' THEN regexp_replace(angkatan, '^PSA', 'KSA', 'i')
      ELSE angkatan
    END
WHERE upper(trim(coalesce(kategori_program, ''))) IN ('PRA', 'PSA')
   OR upper(trim(coalesce(angkatan, ''))) ~ '^(PRA|PSA)([[:space:]]|$)';

COMMIT;
