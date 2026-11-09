import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminCategories, getAdminScope } from "@/lib/admin-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestStatus = "Menunggu" | "Disetujui" | "Ditolak";

export async function GET(request: Request) {
  const requestedStatus = new URL(request.url).searchParams.get("status");
  const statusFilter: RequestStatus =
    requestedStatus === "Disetujui" || requestedStatus === "Ditolak"
      ? requestedStatus
      : "Menunggu";

  const scope = await getAdminScope();
  if (!scope) {
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  }
  if (scope.role === "admin" && !scope.kategoriProgram) {
    return NextResponse.json(
      { error: "Kategori akun Admin belum ditetapkan oleh Super Admin." },
      { status: 403 },
    );
  }

  const allowedCategories = getAdminCategories(scope) ?? [];

  try {
    const sql = db();

    const rows = await sql\`
      SELECT
        r.id,
        r.email,
        r.request_type AS "requestType",
        r.status,
        r.created_at AS "createdAt",
        r.reviewed_at AS "reviewedAt",
        r.review_note AS "reviewNote",
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
      WHERE lower(trim(r.status)) = lower(\${statusFilter})
        AND r.request_type = 'register'
        AND (\${scope.role === "super_admin"} = TRUE OR upper(COALESCE(NULLIF(trim(a.kategori_program), ''), a.angkatan, r.submitted_kategori_program, r.submitted_angkatan, '')) = ANY(\${allowedCategories}))
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT 100
    \`;

    const statusRows = await sql\`
      SELECT r.status, COUNT(*)::int AS total
      FROM alumni_account_requests r
      LEFT JOIN alumni a ON a.id = r.alumni_id
      WHERE r.request_type = 'register'
        AND lower(trim(r.status)) IN ('menunggu', 'disetujui', 'ditolak')
        AND (\${scope.role === "super_admin"} = TRUE OR upper(COALESCE(NULLIF(trim(a.kategori_program), ''), a.angkatan, r.submitted_kategori_program, r.submitted_angkatan, '')) = ANY(\${allowedCategories}))
      GROUP BY r.status
    \`;

    const statusCounts: Record<RequestStatus, number> = {
      Menunggu: 0,
      Disetujui: 0,
      Ditolak: 0,
    };
    for (const row of statusRows) {
      const key = String(row.status || "").trim() as RequestStatus;
      if (key in statusCounts) statusCounts[key] = Number(row.total) || 0;
    }

    return NextResponse.json({
      data: rows,
      statusCounts,
      total: statusCounts[statusFilter],
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
