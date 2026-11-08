CREATE TABLE IF NOT EXISTS public.alumni_credential_vault (
  account_id BIGINT PRIMARY KEY REFERENCES public.alumni_accounts(id) ON DELETE CASCADE,
  encrypted_password TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS alumni_credential_vault_created_at_idx
  ON public.alumni_credential_vault (created_at);