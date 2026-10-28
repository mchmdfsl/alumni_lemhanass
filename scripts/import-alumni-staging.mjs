import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
  else if (fs.existsSync('.env')) process.loadEnvFile('.env');
}
const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('Usage: node scripts/import-alumni-staging.mjs ./alumni_siap_import.csv');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL belum diatur di .env.local atau .env.');
  process.exit(1);
}

function parseCsv(input) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ''));
}
const key = s => String(s ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
const val = (record, ...names) => {
  const entries = new Map(Object.entries(record).map(([k,v]) => [key(k), String(v ?? '').trim()]));
  for (const n of names) if (entries.has(key(n))) return entries.get(key(n));
  return '';
};
const textOrNull = v => v === '' ? null : v;
const intOrNull = v => /^\d+$/.test(v) ? Number(v) : null;

const content = fs.readFileSync(path.resolve(file), 'utf8').replace(/^\uFEFF/, '');
const rows = parseCsv(content);
if (rows.length < 2) throw new Error('CSV kosong atau hanya berisi header.');
const headers = rows[0].map(h => h.trim());
const records = rows.slice(1).map(values => Object.fromEntries(headers.map((h,i) => [h, values[i] ?? ''])));
const required = ['nama'];
if (!headers.some(h => key(h) === 'nama')) throw new Error('Header nama tidak ditemukan.');
const normalized = records.map((r, i) => {
  const nama = val(r, 'nama', 'nama lengkap');
  if (!nama) throw new Error(`Nama kosong pada baris CSV ${i + 2}; impor dibatalkan sebelum menulis.`);
  return {
    nomor_alumni: textOrNull(val(r, 'nomor_alumni', 'nomor alumni')),
    nama,
    angkatan: textOrNull(val(r, 'angkatan', 'kategori_program', 'kategori program')),
    tahun_angkatan: intOrNull(val(r, 'tahun_angkatan', 'tahun angkatan')),
    pangkat: textOrNull(val(r, 'pangkat')),
    nip_nrp: textOrNull(val(r, 'nip_nrp', 'nip nrp')),
    instansi: textOrNull(val(r, 'instansi')),
    jabatan: textOrNull(val(r, 'jabatan')),
    kesatuan: textOrNull(val(r, 'kesatuan')),
    wilayah: textOrNull(val(r, 'wilayah')),
    alamat: textOrNull(val(r, 'alamat')),
    email: textOrNull(val(r, 'email')),
    nomor_hp: textOrNull(val(r, 'nomor_hp', 'nomor hp')),
    sumber_file: path.basename(file),
    sumber_sheet: textOrNull(val(r, 'sumber_sheet', 'sheet')),
    kategori_program: textOrNull(val(r, 'kategori_program', 'kategori program', 'kategori', 'program')),
    nomor_angkatan: intOrNull(val(r, 'nomor_angkatan', 'nomor angkatan'))
  };
});
const sql = postgres(process.env.DATABASE_URL, { ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require', prepare: false });
try {
  const columns = ['nomor_alumni','nama','angkatan','tahun_angkatan','pangkat','nip_nrp','instansi','jabatan','kesatuan','wilayah','alamat','email','nomor_hp','sumber_file','sumber_sheet','kategori_program','nomor_angkatan'];
  await sql.begin(async tx => {
    const [{ count }] = await tx`SELECT COUNT(*)::int AS count FROM public.alumni_import_staging`;
    if (count > 0) throw new Error(`Staging sudah berisi ${count} baris. Tidak ada data yang ditambahkan agar tidak menggandakan impor.`);
    for (let offset = 0; offset < normalized.length; offset += 250) {
      const batch = normalized.slice(offset, offset + 250);
      await tx`INSERT INTO public.alumni_import_staging ${tx(batch, ...columns)}`;
    }
  });
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM public.alumni_import_staging`;
  console.log(`Impor staging selesai: ${count} baris. Tabel alumni utama tidak diubah.`);
} finally {
  await sql.end();
}
