BEGIN;

-- Akun alumni lama harus tetap dapat login dengan nomor alumni.
-- Email akan diisi sendiri oleh alumni melalui halaman Profil Saya.
ALTER TABLE alumni_accounts
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE alumni_accounts
  DROP CONSTRAINT IF EXISTS alumni_accounts_email_not_blank;

-- NULL dapat muncul pada banyak baris dan tidak bentrok dengan unique index.
UPDATE alumni_accounts
SET email = NULL,
    updated_at = NOW()
WHERE email IS NOT NULL;

UPDATE alumni
SET email = NULL,
    updated_at = NOW()
WHERE email IS NOT NULL;

COMMIT;
