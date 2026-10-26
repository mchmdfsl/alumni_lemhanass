import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

// Auto-load .env.local jika belum dimuat
if (!process.env.DATABASE_URL) {
  if (fs.existsSync('.env.local')) {
    process.loadEnvFile('.env.local');
  } else if (fs.existsSync('.env')) {
    process.loadEnvFile('.env');
  }
}

let file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/import-alumni.mjs ./data-alumni.csv');
  process.exit(1);
}

if (!fs.existsSync(file)) {
  console.error(`File "${file}" tidak ditemukan di folder proyek ini.`);
  console.error('Silakan salin file CSV ke dalam folder alumni-lemanhas-main terlebih dahulu:');
  console.error(`  cp ~/Downloads/${path.basename(file)} ./`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL belum diatur di .env.local.');
  process.exit(1);
}

function parseCsv(input) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}
function normalize(value) { return String(value ?? '').trim(); }
function pick(record, ...keys) {
  const normalized = Object.fromEntries(Object.entries(record).map(([k, v]) => [k.trim().toLowerCase().replace(/[\s_-]+/g, ''), v]));
  for (const key of keys) if (normalized[key.toLowerCase().replace(/[\s_-]+/g, '')] !== undefined) return normalize(normalized[key.toLowerCase().replace(/[\s_-]+/g, '')]);
  return '';
}

const csvText = fs.readFileSync(path.resolve(file), 'utf8').replace(/^\uFEFF/, '');
const parsed = parseCsv(csvText);
if (parsed.length < 2) { console.error('CSV kosong atau hanya memiliki header.'); process.exit(1); }
const headers = parsed[0];
const records = parsed.slice(1).map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ''])));
const sql = postgres(process.env.DATABASE_URL, { ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require', prepare: false });
let inserted = 0, skipped = 0, failed = 0;
try {
  await sql.begin(async (tx) => {
    for (const record of records) {
      const nama = pick(record, 'nama', 'nama lengkap', 'name');
      const angkatan = pick(record, 'angkatan', 'program', 'program pendidikan');
      if (!nama || !angkatan) { skipped++; continue; }
      // Email sengaja dikosongkan saat impor; alumni mengisinya sendiri melalui profil.
      try {
        const result = await tx`INSERT INTO alumni
          (nomor_alumni,nama,angkatan,tahun_angkatan,instansi,jabatan,wilayah,alamat,email,nomor_hp,status,sumber_data)
          VALUES (${pick(record, 'nomor alumni', 'nomor_alumni', 'id alumni') || null},${nama.slice(0,200)},${angkatan.slice(0,100)},${Number(pick(record, 'tahun angkatan', 'tahun')) || null},${pick(record, 'instansi', 'lembaga', 'organisasi').slice(0,250)},${pick(record, 'jabatan', 'posisi').slice(0,200)},${pick(record, 'wilayah', 'provinsi', 'domisili').slice(0,150)},${pick(record, 'alamat').slice(0,3000)},${null},${pick(record, 'nomor hp', 'no hp', 'telepon', 'no telepon').slice(0,50)},${['Terverifikasi','Menunggu','Ditolak'].includes(pick(record,'status')) ? pick(record,'status') : 'Menunggu'},'impor')
          ON CONFLICT DO NOTHING RETURNING id`;
        if (result.length) inserted++; else skipped++;
      } catch (error) {
        failed++;
        console.error(`Baris dengan nama "${nama}" gagal diimpor: ${error.message}`);
      }
    }
  });
} finally {
  await sql.end();
}
console.log(`Import selesai. Berhasil: ${inserted}; dilewati/duplikat: ${skipped}; gagal: ${failed}.`);
