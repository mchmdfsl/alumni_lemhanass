import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminScope } from "@/lib/admin-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const scope = await getAdminScope();
  if (!scope) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (scope.role === "admin" && !scope.kategoriProgram) return NextResponse.json({ error: "Kategori akun Admin belum ditetapkan oleh Super Admin." }, { status: 403 });

  try {
    const sql = db();

    // Pengajuan terbaru ditampilkan lebih dulu supaya tidak tertutup
    // oleh 100 pengajuan lama.
    const rows = await sql`
      SELECT
        r.id,
        r.email,
        r.request_type AS "requestType",
        r.status,
        r.created_at AS "createdAt",
        r.alumni_id AS "alumniId",
        a.nomor_alumni AS "nomorAlumni",
        a.nama AS "namaAlumni",
        a.angkatan AS "angkatanAlumni",
        a.kategori_program AS "kategoriProgramAlumni",
        a.nomor_angkatan AS "nomorAngkatanAlumni",
        a.tahun_angkatan AS "tahunAngkatanAlumni",
        r.submitted_nama AS "submittedNama",
        r.submitted_angkatan AS "submittedAngkatan",
        r.submitted_kategori_program AS "submittedKategoriProgram",
        r.submitted_nomor_angkatan AS "submittedNomorAngkatan",
        r.submitted_tahun_angkatan AS "submittedTahunAngkatan",
        r.submitted_nomor_hp AS "submittedNomorHp",
        r.submitted_nomor_alumni AS "submittedNomorAlumni",
        r.submitted_instansi AS "submittedInstansi",
        r.submitted_jabatan AS "submittedJabatan",
        r.submitted_wilayah AS "submittedWilayah",
        r.submitted_alamat AS "submittedAlamat"
      FROM alumni_account_requests r
      LEFT JOIN alumni a ON a.id = r.alumni_id
      WHERE lower(trim(r.status)) = lower('Menunggu')
        AND (${scope.role === "super_admin"} = TRUE OR upper(COALESCE(NULLIF(trim(a.kategori_program), ''), a.angkatan, '')) = ${scope.kategoriProgram ?? ""})
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT 100
    `;

    const [countRow] = await sql`
      SELECT COUNT(*)::int AS total
      FROM alumni_account_requests r
      LEFT JOIN alumni a ON a.id = r.alumni_id
      WHERE lower(trim(r.status)) = lower('Menunggu')
        AND (${scope.role === "super_admin"} = TRUE OR upper(COALESCE(NULLIF(trim(a.kategori_program), ''), a.angkatan, '')) = ${scope.kategoriProgram ?? ""})
    `;

    return NextResponse.json({
      data: rows,
      totalPending: countRow?.total ?? rows.length,
      limit: 100,
    });
  } catch (error) {
    console.error("GET alumni account requests failed:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar pendaftaran akun." },
      { status: 500 },
    );
  }
}
