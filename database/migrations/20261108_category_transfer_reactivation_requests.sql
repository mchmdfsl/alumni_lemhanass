BEGIN;

CREATE TABLE IF NOT EXISTS public.alumni_category_transfer_requests (
  id BIGSERIAL PRIMARY KEY,
  alumni_id BIGINT NOT NULL REFERENCES public.alumni(id) ON DELETE CASCADE,
  current_kategori_program VARCHAR(100) NOT NULL,
  requested_kategori_program VARCHAR(100) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Menunggu'
    CHECK (status IN ('Menunggu', 'Disetujui', 'Ditolak')),
  admin_note TEXT,
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (current_kategori_program <> requested_kategori_program)
);

CREATE UNIQUE INDEX IF NOT EXISTS alumni_category_transfer_one_pending_per_alumni
  ON public.alumni_category_transfer_requests (alumni_id)
  WHERE status = 'Menunggu';

CREATE INDEX IF NOT EXISTS alumni_category_transfer_status_created_idx
  ON public.alumni_category_transfer_requests (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.alumni_account_reactivation_requests (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES public.alumni_accounts(id) ON DELETE CASCADE,
  alumni_id BIGINT NOT NULL REFERENCES public.alumni(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Menunggu'
    CHECK (status IN ('Menunggu', 'Disetujui', 'Ditolak')),
  admin_note TEXT,
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS alumni_account_reactivation_one_pending_per_account
  ON public.alumni_account_reactivation_requests (account_id)
  WHERE status = 'Menunggu';

CREATE INDEX IF NOT EXISTS alumni_account_reactivation_status_created_idx
  ON public.alumni_account_reactivation_requests (status, created_at DESC);

COMMIT;
