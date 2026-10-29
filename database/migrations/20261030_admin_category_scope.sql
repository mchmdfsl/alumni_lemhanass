-- Tambahkan pembatasan kategori untuk setiap akun Admin.
-- Akun Admin lama perlu diberi kategori oleh Super Admin sebelum dapat mengelola data.
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS kategori_program VARCHAR(80);

ALTER TABLE admin_users
  DROP CONSTRAINT IF EXISTS admin_users_role_check;

ALTER TABLE admin_users
  ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('admin', 'super_admin'));

CREATE INDEX IF NOT EXISTS admin_users_category_active_idx
  ON admin_users (UPPER(TRIM(kategori_program)))
  WHERE is_active = TRUE AND role = 'admin';
