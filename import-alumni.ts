import { Client } from 'pg';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

interface AlumniRow {
  NAMA?: string;
  'NAMA LENGKAP'?: string;
  EMAIL?: string;
  'NO. HP'?: string | number;
  'NO HP'?: string | number;
  INSTANSI?: string;
  JABATAN?: string;
  ALAMAT?: string;
}

async function runStagingImport() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL tidak ditemukan di file .env');
    return;
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('🔗 Terhubung ke database Neon (Staging Mode).');

  // Buat tabel staging khusus pembersihan data
  await client.query(`
    CREATE TABLE IF NOT EXISTS alumni_staging (
      id BIGSERIAL PRIMARY KEY,
      nomor_alumni VARCHAR(80),
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
      status VARCHAR(20) NOT NULL DEFAULT 'Terverifikasi',
      sumber_data VARCHAR(20) NOT NULL DEFAULT 'impor',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('📋 Tabel staging "alumni_staging" siap digunakan.');

  const dataDir = path.join(__dirname, 'data_alumni');
  if (!fs.existsSync(dataDir)) {
    console.log(`⚠️ Folder "data_alumni" tidak ditemukan di ${dataDir}. Buat folder tersebut dan masukkan file Excel/CSV rekap Anda.`);
    await client.end();
    return;
  }

  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.csv'));
  if (files.length === 0) {
    console.log('⚠️ Tidak ada file .xlsx atau .csv di dalam folder "data_alumni".');
    await client.end();
    return;
  }

  let totalImported = 0;

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    console.log(`📂 Membaca file: ${file}...`);

    let rows: AlumniRow[] = [];
    if (file.endsWith('.xlsx')) {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      rows = xlsx.utils.sheet_to_json<AlumniRow>(workbook.Sheets[sheetName]);
    }

    for (const r of rows) {
      const rawNama = r.NAMA || r['NAMA LENGKAP'] || '';
      if (!rawNama || typeof rawNama !== 'string' || rawNama.trim() === '') continue;

      const nama = rawNama.trim();
      const email = r.EMAIL && String(r.EMAIL).trim() !== '' ? String(r.EMAIL).trim() : null;
      const nomor_hp = String(r['NO. HP'] || r['NO HP'] || '').trim();
      const instansi = String(r.INSTANSI || '').trim();
      const jabatan = String(r.JABATAN || '').trim();
      const alamat = String(r.ALAMAT || '').trim();

      // Deteksi kategori program otomatis dari nama file
      let kategori = 'TAPLAI';
      const upperFile = file.toUpperCase();
      if (upperFile.includes('P4N')) kategori = 'P4N';
      else if (upperFile.includes('KRA')) kategori = 'KRA';
      else if (upperFile.includes('PPRA')) kategori = 'PPRA';

      const angkatanInfo = file.replace(/\.[^/.]+$/, '');

      const query = `
        INSERT INTO alumni_staging 
          (nama, angkatan, kategori_program, instansi, jabatan, alamat, email, nomor_hp, status, sumber_data)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, 'Terverifikasi', 'impor')
      `;

      try {
        await client.query(query, [
          nama,
          angkatanInfo,
          kategori,
          instansi,
          jabatan,
          alamat,
          email,
          nomor_hp
        ]);
        totalImported++;
      } catch (err) {
        console.error(`❌ Gagal memasukkan data "${nama}":`, err);
      }
    }
  }

  console.log(`✨ Selesai! Total ${totalImported} data berhasil dimasukkan ke tabel "alumni_staging".`);
  await client.end();
}

runStagingImport().catch(console.error);
