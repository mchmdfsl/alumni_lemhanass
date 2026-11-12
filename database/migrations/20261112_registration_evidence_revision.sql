-- Add evidence upload and revision-request support for new alumni registrations.
-- Additive only: existing requests and alumni records remain unchanged.

ALTER TABLE public.alumni_account_requests
  ADD COLUMN IF NOT EXISTS submitted_bukti_url TEXT,
  ADD COLUMN IF NOT EXISTS submitted_bukti_nama VARCHAR(255),
  ADD COLUMN IF NOT EXISTS submitted_bukti_jenis VARCHAR(80),
  ADD COLUMN IF NOT EXISTS revision_requested_at TIMESTAMPTZ;
