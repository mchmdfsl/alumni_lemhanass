-- Sinkronisasi tabel alumni lama dengan struktur yang dipakai aplikasi.
-- Aman dijalankan berulang kali; tidak menghapus atau mengganti baris alumni yang ada.
ALTER TABLE public.alumni
  ADD COLUMN IF NOT EXISTS kategori_program VARCHAR(80),
  ADD COLUMN IF NOT EXISTS nomor_angkatan VARCHAR(40),
  ADD COLUMN IF NOT EXISTS tahun_angkatan INTEGER,
  ADD COLUMN IF NOT EXISTS alasan_penolakan TEXT,
  ADD COLUMN IF NOT EXISTS sumber_data VARCHAR(20) NOT NULL DEFAULT 'impor',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Data lama biasanya menyimpan kategori program pada kolom angkatan.
-- Salin hanya ke kolom baru yang masih kosong agar data asli tetap terjaga.
UPDATE public.alumni
SET kategori_program = NULLIF(BTRIM(angkatan), '')
WHERE kategori_program IS NULL OR BTRIM(kategori_program) = '';

CREATE INDEX IF NOT EXISTS alumni_status_idx ON public.alumni(status);
CREATE INDEX IF NOT EXISTS alumni_angkatan_idx ON public.alumni(angkatan);
CREATE INDEX IF NOT EXISTS alumni_kategori_program_idx ON public.alumni(kategori_program);
CREATE INDEX IF NOT EXISTS alumni_nomor_angkatan_idx ON public.alumni(nomor_angkatan);
CREATE INDEX IF NOT EXISTS alumni_tahun_angkatan_idx ON public.alumni(tahun_angkatan);
CREATE INDEX IF NOT EXISTS alumni_wilayah_idx ON public.alumni(wilayah);
