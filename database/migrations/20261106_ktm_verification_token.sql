ALTER TABLE alumni
  ADD COLUMN IF NOT EXISTS ktm_verification_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS alumni_ktm_verification_token_uidx
  ON alumni (ktm_verification_token);
