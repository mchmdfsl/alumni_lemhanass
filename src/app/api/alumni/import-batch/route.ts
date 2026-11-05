import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignAlumniNumber } from "@/lib/alumni-number";
import { adminCanManageCategory, getAdminCategories, getAdminScope } from "@/lib/admin-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImportRecord = { nomorAlumni?: unknown; nama?: unknown; kategoriProgram?: unknown; nomorAngkatan?: unknown; tahunAngkatan?: unknown; status?: unknown; instansi?: unknown; jabatan?: unknown; wilayah?: unknown; alamat?: unknown; nomorHp?: unknown };
const str = (value: unknown, max = 3000) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: NextRequest) {
  const scope = await getAdminScope();
  if (!scope) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (scope.role === "admin" && !scope.kategoriProgram) return NextResponse.json({ error: "Kategori akun Admin belum ditetapkan oleh Super Admin." }, { status: 403 });
  const allowedCategories = getAdminCategories(scope) ?? [];
  try {
    const body = await request.json();
    if (!Array.isArray(body?.rows) || body.rows.length < 1 || body.rows.length > 100) {
      return NextResponse.json({ error: "Kirim 1 sampai 100 baris per batch." }, { status: 400 });
    }
    const rows = body.rows as ImportRecord[];
    const sourceFile = str(body?.sourceFile, 255) || "import-manual.csv";
    const normalized = rows.map((row, index) => ({
      index,
      nomorAlumni: str(row.nomorAlumni, 80),
      nama: str(row.nama, 200),
      kategoriProgram: str(row.kategoriProgram, 80).toLocaleUpperCase("id-ID"),
      nomorAngkatan: str(row.nomorAngkatan, 40),
      tahunAngkatan: str(row.tahunAngkatan, 4),
      status: str(row.status, 30),
      instansi: str(row.instansi, 250),
      jabatan: str(row.jabatan, 200),
      wilayah: str(row.wilayah, 150),
      alamat: str(row.alamat, 3000),
      nomorHp: str(row.nomorHp, 50),
    }));
    if (scope.role === "admin" && normalized.some((row) => !adminCanManageCategory(scope, row.kategoriProgram))) return NextResponse.json({ error: "Admin hanya boleh mengimpor data untuk kategori kelompoknya." }, { status: 403 });
    const invalid = normalized.find((row) => row.nama.length < 2 || !/^[A-Z0-9]+(?:[ ][A-Z0-9]+){0,3}$/.test(row.kategoriProgram) || !row.nomorAngkatan || !/^\d{4}$/.test(row.tahunAngkatan) || Number(row.tahunAngkatan) < 1900 || Number(row.tahunAngkatan) > new Date().getFullYear() + 5 || row.status !== "Menunggu");
    if (invalid) return NextResponse.json({ error: `Baris ke-${invalid.index + 1} tidak valid. Nama, kategori, nomor angkatan, tahun angkatan wajib diisi dan status harus Menunggu. Kolom profil lainnya opsional.` }, { status: 400 });

    const result = await db().begin(async (tx) => {
      const outcomes: Array<{ index: number; action: "inserted" | "updated" }> = [];
      for (const row of normalized) {
        let matches: Array<{ id: number }> = [];
        if (row.nomorAlumni) {
          matches = await tx`SELECT id FROM alumni WHERE trim(COALESCE(nomor_alumni, '')) = ${row.nomorAlumni} AND (${scope.role === "super_admin"} = TRUE OR upper(COALESCE(NULLIF(trim(kategori_program), ''), angkatan, '')) = ANY(${allowedCategories})) ORDER BY id ASC LIMIT 2 FOR UPDATE`;
          if (matches.length > 1) throw new Error(`Nomor alumni duplikat di database pada baris ${row.index + 1}.`);
        }
        if (!matches.length) {
          matches = await tx`
            SELECT a.id FROM alumni a
            CROSS JOIN LATERAL (SELECT regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|KRA|PPRA|P4N|KSA|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)') AS parts) legacy
            WHERE lower(trim(a.nama)) = lower(${row.nama})
              AND CASE
                WHEN legacy.parts[1] IS NOT NULL
                  AND upper(trim(coalesce(a.kategori_program, ''))) IN ('', upper(trim(coalesce(a.angkatan, ''))))
                  THEN legacy.parts[1]
                ELSE COALESCE(NULLIF(upper(trim(a.kategori_program)), ''), legacy.parts[1], a.angkatan)
              END = ${row.kategoriProgram}
              AND COALESCE(NULLIF(trim(a.nomor_angkatan), ''), legacy.parts[2], '') = ${row.nomorAngkatan}
              AND a.tahun_angkatan::text = ${row.tahunAngkatan}
            ORDER BY a.id ASC LIMIT 2 FOR UPDATE OF a
          `;
          if (matches.length > 1) throw new Error(`Identitas alumni cocok dengan lebih dari satu data pada baris ${row.index + 1}; periksa nomor alumni agar tidak salah memperbarui data.`);
        }
        if (matches.length === 1) {
          await tx`UPDATE alumni SET
            nomor_alumni = CASE WHEN ${row.nomorAlumni} <> '' THEN ${row.nomorAlumni} ELSE nomor_alumni END,
            nama = ${row.nama}, angkatan = ${row.kategoriProgram}, kategori_program = ${row.kategoriProgram},
            nomor_angkatan = ${row.nomorAngkatan}, tahun_angkatan = ${Number(row.tahunAngkatan)},
            instansi = COALESCE(NULLIF(${row.instansi}, ''), instansi),
            jabatan = COALESCE(NULLIF(${row.jabatan}, ''), jabatan),
            wilayah = COALESCE(NULLIF(${row.wilayah}, ''), wilayah),
            alamat = COALESCE(NULLIF(${row.alamat}, ''), alamat),
            nomor_hp = COALESCE(NULLIF(${row.nomorHp}, ''), nomor_hp),
            sumber_file = ${sourceFile},
            updated_at = NOW() WHERE id = ${Number(matches[0].id)}`;
          if (!row.nomorAlumni) { const current = await tx`SELECT id, nomor_alumni AS "nomorAlumni" FROM alumni WHERE id = ${Number(matches[0].id)} FOR UPDATE`; if (!current[0]?.nomorAlumni) await assignAlumniNumber(tx, Number(matches[0].id), row.kategoriProgram, null); }
          outcomes.push({ index: row.index, action: "updated" });
        } else {
          const inserted = await tx`INSERT INTO alumni (nomor_alumni, nama, angkatan, kategori_program, nomor_angkatan, tahun_angkatan, instansi, jabatan, wilayah, alamat, email, nomor_hp, status, sumber_data, sumber_file)
            VALUES (${row.nomorAlumni || null}, ${row.nama}, ${row.kategoriProgram}, ${row.kategoriProgram}, ${row.nomorAngkatan}, ${Number(row.tahunAngkatan)}, ${row.instansi}, ${row.jabatan}, ${row.wilayah}, ${row.alamat}, NULL, ${row.nomorHp}, 'Menunggu', 'impor', ${sourceFile})
            RETURNING id`;
          await assignAlumniNumber(tx, Number(inserted[0].id), row.kategoriProgram, row.nomorAlumni || null);
          outcomes.push({ index: row.index, action: "inserted" });
        }
      }
      return outcomes;
    });
    return NextResponse.json({ ok: true, processed: result.length, inserted: result.filter((item) => item.action === "inserted").length, updated: result.filter((item) => item.action === "updated").length, results: result });
  } catch (error) {
    console.error("POST /api/alumni/import-batch failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Batch import gagal. Tidak ada perubahan pada batch ini." }, { status: 500 });
  }
}
