-- Jalankan sekali di Neon SQL Editor sebelum deploy kode yang memakai email NULL.
-- Semua email lama di tabel alumni dan alumni_accounts dikosongkan.
BEGIN;
ALTER TABLE alumni_accounts ALTER COLUMN email DROP NOT NULL;
UPDATE alumni_accounts SET email = NULL WHERE email IS NOT NULL;
UPDATE alumni SET email = NULL WHERE email IS NOT NULL;
COMMIT;
