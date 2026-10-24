
BEGIN;

CREATE TABLE IF NOT EXISTS alumni_user_requests (
    id BIGSERIAL PRIMARY KEY,
    alumni_id BIGINT NOT NULL
        REFERENCES alumni(id) ON DELETE CASCADE,

    request_type VARCHAR(30) NOT NULL
        CHECK (
            request_type IN (
                'profile_update',
                'data_update',
                'delete_account'
            )
        ),

    payload JSONB,
    message TEXT NOT NULL DEFAULT '',

    status VARCHAR(20) NOT NULL DEFAULT 'Menunggu'
        CHECK (
            status IN ('Menunggu', 'Disetujui', 'Ditolak')
        ),

    admin_note TEXT,
    reviewed_by VARCHAR(254),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS alumni_user_requests_owner_idx
    ON alumni_user_requests (alumni_id, created_at DESC);

CREATE INDEX IF NOT EXISTS alumni_user_requests_status_idx
    ON alumni_user_requests (status, created_at DESC);

COMMIT;
