# Sistem Pendataan Alumni Lemhannas

Aplikasi Next.js 16 dengan PostgreSQL. Repository ini memuat antarmuka admin, API backend awal, autentikasi admin berbasis cookie, alur pengajuan alumni, serta importer CSV.

## Kebutuhan
- Node.js 20.9 atau lebih baru
- pnpm 10 (sesuai `packageManager`)
- PostgreSQL 15+

## Menjalankan lokal / VPS
1. Install dependency: `pnpm install`
2. Buat database PostgreSQL dan user khusus aplikasi dengan hak akses minimum.
3. Jalankan schema: `psql "$DATABASE_URL" -f db/schema.sql`.
4. Terapkan file migrasi di `db/migrations/` yang belum pernah dijalankan, terutama `001_auth_accounts.sql`, `002_alumni_registration_details.sql`, `002_alumni_user_requests.sql`, dan `003_password_reset_tokens.sql`. Untuk migrasi email kosong, jalankan juga `002_allow_empty_alumni_email.sql` dan migrasi pembersihan email bila memang ingin semua email data lama dikosongkan.
5. Salin `.env.example` ke `.env.local`, lalu atur `DATABASE_URL`, `ADMIN_USERNAME` atau `ADMIN_EMAIL`, `ADMIN_PASSWORD`, dan `SESSION_SECRET` yang acak dan panjang. Untuk login Super Admin melalui halaman login yang sama, atur juga `SUPER_ADMIN_USERNAME` atau `SUPER_ADMIN_EMAIL` serta `SUPER_ADMIN_PASSWORD` dengan kredensial yang berbeda.
6. Agar fitur lupa password dapat mengirim email, atur `RESEND_API_KEY`, `PASSWORD_RESET_FROM` (alamat pengirim yang sudah diverifikasi di Resend), dan `NEXT_PUBLIC_APP_URL` (alamat situs lengkap, misalnya `https://domain-anda.id`). Tanpa konfigurasi email tersebut, halaman lupa password tetap terbuka tetapi pengiriman tautan reset belum aktif.
7. Jalankan development: `pnpm dev`
8. Uji build produksi: `pnpm build` lalu `pnpm start`

Jangan commit `.env.local`, kredensial database, atau file CSV berisi data pribadi alumni. Aktifkan HTTPS di reverse proxy VPS. Batasi akses port PostgreSQL ke jaringan privat/localhost.

## API
- `POST /api/auth/login` — login admin menggunakan `identifier` dan `password`.
- `POST /api/auth/logout` — menghapus sesi admin.
- `GET /api/auth/me` — status sesi admin/alumni.
- `POST /api/auth/forgot-password` — meminta tautan reset password lewat email terdaftar.
- `POST /api/auth/reset-password` — mengganti password memakai token satu kali yang kedaluwarsa dalam 30 menit.
- `PATCH /api/user/password` — mengganti password alumni setelah memverifikasi password saat ini.
- `GET /api/alumni` — daftar alumni (wajib login); query opsional `search`, `status`, `angkatan`, `wilayah`, `limit`, `offset`.
- `POST /api/alumni` — tambah data alumni secara manual (wajib login).
- `PATCH /api/alumni/:id` — edit data alumni (nama, email, angkatan, instansi, jabatan, wilayah, alamat, nomorHp, status, nomorAlumni); wajib login.
- `DELETE /api/alumni/:id` — hapus data alumni; wajib login.
- `PATCH /api/alumni/:id/status` — ubah status ke `Menunggu`, `Terverifikasi`, atau `Ditolak`; alasan wajib untuk penolakan (wajib login).
- `GET /api/alumni/export` — ekspor seluruh data alumni sebagai CSV (UTF-8 BOM); query opsional `status`, `angkatan`, `wilayah`; wajib login.
- `POST /api/public/alumni` — pengajuan alumni publik, status awal `Menunggu`.
- `GET /api/stats/wilayah` — statistik jumlah alumni per wilayah; wajib login.
- `GET /api/stats/angkatan` — statistik jumlah alumni per angkatan beserta wilayah dominan; wajib login.
- `GET /api/stats/aktivitas` — statistik aktivitas data alumni bulan berjalan (baru, diperbarui, diverifikasi, ditolak); wajib login.

## Impor CSV
CSV UTF-8 dengan header yang sesuai. Kolom yang dikenali antara lain `nama`, `angkatan`, `nomor alumni`, `tahun angkatan`, `instansi`, `jabatan`, `wilayah`/`provinsi`, `alamat`, `email`, `nomor hp`, `status`. `nama` dan `angkatan` wajib. Bila kolom status tidak tersedia atau tidak cocok, data diimpor sebagai `Menunggu` agar tidak otomatis melewati verifikasi. Setelah data diperiksa, admin dapat memverifikasi data yang benar.

```bash
node --env-file=.env.local scripts/import-alumni.mjs ./data-alumni.csv
```

`ON CONFLICT DO NOTHING` melewati duplikasi berdasarkan unique constraints. Lakukan backup database sebelum impor. Uji impor terlebih dahulu dengan salinan kecil yang tidak berisi data sensitif.

## Catatan kesiapan
Proxy server memproteksi rute `/admin` dengan sesi bertanda tangan; API tetap memeriksa sesi secara terpisah. API dan schema perlu diuji pada lingkungan VPS aktual. Halaman dashboard dan beberapa modul UI lama masih berisi data statis; jangan menganggap angka dashboard atau semua menu laporan telah terhubung ke database sebelum integrasi UI lanjutan selesai.
