CREATE TABLE IF NOT EXISTS ktm_signature_settings (
  id BIGSERIAL PRIMARY KEY,
  kategori_program TEXT NOT NULL UNIQUE,
  nama_deputi TEXT NOT NULL DEFAULT '',
  jabatan_deputi TEXT NOT NULL DEFAULT 'Deputi',
  signature_url TEXT,
  format_ttd TEXT NOT NULL DEFAULT 'standard'
    CHECK (format_ttd IN ('standard', 'tot_white')),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ktm_signature_settings_category
  ON ktm_signature_settings (kategori_program);
