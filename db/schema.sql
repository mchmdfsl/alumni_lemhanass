CREATE TABLE IF NOT EXISTS alumni (
  id BIGSERIAL PRIMARY KEY,
  nomor_alumni VARCHAR(80) UNIQUE,
  nama VARCHAR(200) NOT NULL,
  angkatan VARCHAR(100) NOT NULL DEFAULT '',
  kategori_program VARCHAR(80),
  nomor_angkatan VARCHAR(40),
  tahun_angkatan INTEGER,
  instansi VARCHAR(250) NOT NULL DEFAULT '',
  jabatan VARCHAR(200) NOT NULL DEFAULT '',
  wilayah VARCHAR(150) NOT NULL DEFAULT '',
  alamat TEXT NOT NULL DEFAULT '',
  email VARCHAR(254),
  nomor_hp VARCHAR(50) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'Menunggu' CHECK (status IN ('Menunggu', 'Terverifikasi', 'Ditolak')),
  alasan_penolakan TEXT,
  sumber_data VARCHAR(20) NOT NULL DEFAULT 'impor' CHECK (sumber_data IN ('impor', 'pengajuan')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS alumni_email_unique ON alumni (LOWER(email)) WHERE email IS NOT NULL AND email <> '';
CREATE INDEX IF NOT EXISTS alumni_status_idx ON alumni(status);
CREATE INDEX IF NOT EXISTS alumni_angkatan_idx ON alumni(angkatan);
CREATE INDEX IF NOT EXISTS alumni_kategori_program_idx ON alumni(kategori_program);
CREATE INDEX IF NOT EXISTS alumni_nomor_angkatan_idx ON alumni(nomor_angkatan);
CREATE INDEX IF NOT EXISTS alumni_tahun_angkatan_idx ON alumni(tahun_angkatan);
CREATE INDEX IF NOT EXISTS alumni_wilayah_idx ON alumni(wilayah);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  action VARCHAR(80) NOT NULL,
  alumni_id BIGINT REFERENCES alumni(id) ON DELETE SET NULL,
  actor VARCHAR(254) NOT NULL DEFAULT 'admin',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
