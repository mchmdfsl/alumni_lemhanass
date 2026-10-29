import fs from 'node:fs';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
  else if (fs.existsSync('.env')) process.loadEnvFile('.env');
}

const apply = process.argv.includes('--apply');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL belum diatur. Atur di .env.local atau environment Codespaces.');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require',
  prepare: false,
  max: 1,
});

const normalizeCategory = `CASE
  WHEN UPPER(TRIM(s.kategori_program)) = 'KRA' THEN 'PRA'
  WHEN UPPER(TRIM(s.kategori_program)) = 'KSA' THEN 'PSA'
  ELSE UPPER(TRIM(s.kategori_program))
END`;

const normalizeCohort = `CASE
  WHEN UPPER(TRIM(s.angkatan)) ~ '^KRA([[:space:]]|$)'
    THEN REGEXP_REPLACE(TRIM(s.angkatan), '^KRA', 'PRA', 'i')
  WHEN UPPER(TRIM(s.angkatan)) ~ '^KSA([[:space:]]|$)'
    THEN REGEXP_REPLACE(TRIM(s.angkatan), '^KSA', 'PSA', 'i')
  ELSE TRIM(s.angkatan)
END`;

try {
  await sql.begin(async tx => {
    const [{ count: stagingCount }] = await tx`
      SELECT COUNT(*)::int AS count FROM public.alumni_import_staging
    `;
    if (stagingCount === 0) throw new Error('Staging kosong. Tidak ada data untuk diproses.');

    const [{ count: blankRequired }] = await tx`
      SELECT COUNT(*)::int AS count
      FROM public.alumni_import_staging
      WHERE nama IS NULL OR TRIM(nama) = ''
         OR angkatan IS NULL OR TRIM(angkatan) = ''
    `;

    const [{ count: duplicateIdentityGroups }] = await tx`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT LOWER(TRIM(nama)), UPPER(TRIM(angkatan))
        FROM public.alumni_import_staging
        GROUP BY LOWER(TRIM(nama)), UPPER(TRIM(angkatan))
        HAVING COUNT(*) > 1
      ) d
    `;

    const [{ count: candidates }] = await tx.unsafe(`
      SELECT COUNT(*)::int AS count
      FROM public.alumni_import_staging s
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.alumni a
        WHERE LOWER(TRIM(a.nama)) = LOWER(TRIM(s.nama))
          AND UPPER(TRIM(a.angkatan)) = UPPER(${normalizeCohort})
      )
    `);

    const [{ count: duplicateCandidateEmails }] = await tx.unsafe(`
      WITH candidates AS (
        SELECT LOWER(TRIM(s.email)) AS email_normal
        FROM public.alumni_import_staging s
        WHERE s.email IS NOT NULL AND TRIM(s.email) <> ''
          AND NOT EXISTS (
            SELECT 1 FROM public.alumni a
            WHERE LOWER(TRIM(a.nama)) = LOWER(TRIM(s.nama))
              AND UPPER(TRIM(a.angkatan)) = ${normalizeCohort}
          )
      )
      SELECT COUNT(*)::int AS count FROM (
        SELECT email_normal FROM candidates
        GROUP BY email_normal HAVING COUNT(*) > 1
      ) d
    `);

    const [{ count: existingEmailConflicts }] = await tx.unsafe(`
      SELECT COUNT(*)::int AS count
      FROM public.alumni_import_staging s
      WHERE s.email IS NOT NULL AND TRIM(s.email) <> ''
        AND NOT EXISTS (
          SELECT 1 FROM public.alumni a
          WHERE LOWER(TRIM(a.nama)) = LOWER(TRIM(s.nama))
            AND UPPER(TRIM(a.angkatan)) = ${normalizeCohort}
        )
        AND EXISTS (
          SELECT 1 FROM public.alumni a
          WHERE LOWER(TRIM(a.email)) = LOWER(TRIM(s.email))
            AND a.email IS NOT NULL AND TRIM(a.email) <> ''
        )
    `);

    const [{ count: duplicateCandidateNumbers }] = await tx`
      WITH candidates AS (
        SELECT NULLIF(TRIM(s.nomor_alumni), '') AS nomor_alumni
        FROM public.alumni_import_staging s
        WHERE s.nomor_alumni IS NOT NULL AND TRIM(s.nomor_alumni) <> ''
          AND NOT EXISTS (
            SELECT 1 FROM public.alumni a
            WHERE LOWER(TRIM(a.nama)) = LOWER(TRIM(s.nama))
              AND UPPER(TRIM(a.angkatan)) = UPPER(TRIM(s.angkatan))
          )
      )
      SELECT COUNT(*)::int AS count FROM (
        SELECT nomor_alumni FROM candidates
        GROUP BY nomor_alumni HAVING COUNT(*) > 1
      ) d
    `;

    const [{ count: existingNumberConflicts }] = await tx`
      SELECT COUNT(*)::int AS count
      FROM public.alumni_import_staging s
      WHERE s.nomor_alumni IS NOT NULL AND TRIM(s.nomor_alumni) <> ''
        AND NOT EXISTS (
          SELECT 1 FROM public.alumni a
          WHERE LOWER(TRIM(a.nama)) = LOWER(TRIM(s.nama))
            AND UPPER(TRIM(a.angkatan)) = UPPER(TRIM(s.angkatan))
        )
        AND EXISTS (
          SELECT 1 FROM public.alumni a
          WHERE a.nomor_alumni = TRIM(s.nomor_alumni)
        )
    `;

    console.log('\n=== SIMULASI IMPOR ALUMNI ===');
    console.log(`Baris staging: ${stagingCount}`);
    console.log(`Calon baris baru: ${candidates}`);
    console.log(`Baris yang sudah cocok dengan data utama: ${stagingCount - candidates}`);
    console.log(`Baris dengan nama/angkatan kosong: ${blankRequired}`);
    console.log(`Grup identitas ganda di staging: ${duplicateIdentityGroups}`);
    console.log(`Grup email ganda di calon data baru: ${duplicateCandidateEmails}`);
    console.log(`Calon data dengan email yang sudah dipakai: ${existingEmailConflicts}`);
    console.log(`Grup nomor alumni ganda di calon data baru: ${duplicateCandidateNumbers}`);
    console.log(`Calon data dengan nomor alumni yang sudah dipakai: ${existingNumberConflicts}`);
    console.log('Pemetaan kategori: KRA → PRA, KSA → PSA');
    console.log('Status data baru: Menunggu | sumber_data: impor');

    if (!apply) {
      console.log('\nMode simulasi: database belum diubah.');
      console.log('Periksa hasil di atas. Jika semua pemeriksaan konflik bernilai 0, jalankan ulang dengan --apply.');
      return;
    }

    if (blankRequired > 0) throw new Error('Ada nama/angkatan kosong; transaksi dibatalkan.');
    if (duplicateIdentityGroups > 0) throw new Error('Ada identitas nama+angkatan ganda di staging; transaksi dibatalkan.');
    if (duplicateCandidateEmails > 0 || existingEmailConflicts > 0) {
      throw new Error('Ada konflik email; transaksi dibatalkan agar indeks unik tidak dilanggar.');
    }
    if (duplicateCandidateNumbers > 0 || existingNumberConflicts > 0) {
      throw new Error('Ada konflik nomor alumni; transaksi dibatalkan agar indeks unik tidak dilanggar.');
    }

    const inserted = await tx.unsafe(`
      INSERT INTO public.alumni (
        nomor_alumni, nama, angkatan, tahun_angkatan, instansi, jabatan,
        wilayah, alamat, email, nomor_hp, status, alasan_penolakan,
        sumber_data, pangkat, nip_nrp, kesatuan, sumber_file, sumber_sheet,
        kategori_program, nomor_angkatan, created_at, updated_at
      )
      SELECT
        NULLIF(TRIM(s.nomor_alumni), ''),
        TRIM(s.nama),
        ${normalizeCohort},
        s.tahun_angkatan,
        COALESCE(NULLIF(TRIM(s.instansi), ''), ''),
        COALESCE(NULLIF(TRIM(s.jabatan), ''), ''),
        COALESCE(NULLIF(TRIM(s.wilayah), ''), ''),
        COALESCE(NULLIF(TRIM(s.alamat), ''), ''),
        NULLIF(TRIM(s.email), ''),
        COALESCE(NULLIF(TRIM(s.nomor_hp), ''), ''),
        'Menunggu',
        NULL,
        'impor',
        s.pangkat,
        s.nip_nrp,
        s.kesatuan,
        s.sumber_file,
        s.sumber_sheet,
        ${normalizeCategory},
        CASE WHEN s.nomor_angkatan IS NULL THEN NULL ELSE s.nomor_angkatan::text END,
        NOW(),
        NOW()
      FROM public.alumni_import_staging s
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.alumni a
        WHERE LOWER(TRIM(a.nama)) = LOWER(TRIM(s.nama))
          AND UPPER(TRIM(a.angkatan)) = ${normalizeCohort}
      )
      RETURNING id
    `);

    console.log(`\nImpor selesai. Baris baru dimasukkan: ${inserted.length}`);
    const [{ count: finalCount }] = await tx`SELECT COUNT(*)::int AS count FROM public.alumni`;
    console.log(`Total baris tabel alumni setelah impor: ${finalCount}`);
  });
} catch (error) {
  console.error('\nImpor dibatalkan:', error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
