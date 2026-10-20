import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });

  const query = request.nextUrl.searchParams;
  const status = query.get("status") ?? "";
  const angkatan = query.get("angkatan") ?? "";
  const wilayah = query.get("wilayah") ?? "";

  try {
    const rows = await db()`
      SELECT
        COALESCE(nomor_alumni, '') AS "nomorAlumni",
        nama,
        angkatan,
        COALESCE(tahun_angkatan::text, '') AS "tahunAngkatan",
        instansi,
        jabatan,
        wilayah,
        alamat,
        COALESCE(email, '') AS email,
        nomor_hp AS "nomorHp",
        status,
        COALESCE(alasan_penolakan, '') AS "alasanPenolakan",
        sumber_data AS "sumberData",
        TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') AS "createdAt",
        TO_CHAR(updated_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') AS "updatedAt",
        CASE WHEN verified_at IS NOT NULL
          THEN TO_CHAR(verified_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS')
          ELSE '' END AS "verifiedAt"
      FROM alumni
      WHERE (${status} = '' OR status = ${status})
        AND (${angkatan} = '' OR angkatan = ${angkatan})
        AND (${wilayah} = '' OR wilayah = ${wilayah})
      ORDER BY created_at ASC`;

    // Build CSV
    const headers = [
      "Nomor Alumni", "Nama", "Angkatan", "Tahun Angkatan", "Instansi",
      "Jabatan", "Wilayah", "Alamat", "Email", "Nomor HP", "Status",
      "Alasan Penolakan", "Sumber Data", "Tanggal Input", "Tanggal Update", "Tanggal Verifikasi",
    ];

    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csvLines: string[] = [headers.map(escape).join(",")];
    for (const r of rows) {
      csvLines.push([
        r.nomorAlumni, r.nama, r.angkatan, r.tahunAngkatan, r.instansi,
        r.jabatan, r.wilayah, r.alamat, r.email, r.nomorHp, r.status,
        r.alasanPenolakan, r.sumberData, r.createdAt, r.updatedAt, r.verifiedAt,
      ].map(escape).join(","));
    }

    const csv = "\uFEFF" + csvLines.join("\r\n"); // BOM untuk Excel
    const filename = `alumni-lemhannas-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/alumni/export failed", error);
    return NextResponse.json({ error: "Gagal mengekspor data alumni." }, { status: 500 });
  }
}
