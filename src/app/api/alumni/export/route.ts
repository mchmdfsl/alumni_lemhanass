import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminScope } from "@/lib/admin-scope";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const scope = await getAdminScope();
  if (!scope) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (scope.role === "admin" && !scope.kategoriProgram) return NextResponse.json({ error: "Kategori akun Admin belum ditetapkan oleh Super Admin." }, { status: 403 });

  const query = request.nextUrl.searchParams;
  const status = query.get("status") ?? "";
  const angkatan = query.get("kategoriProgram") ?? query.get("angkatan") ?? "";
  const wilayah = query.get("wilayah") ?? "";
  const nama = (query.get("nama") ?? query.get("search") ?? "").trim().slice(0, 120);
  const nomorAlumni = (query.get("nomorAlumni") ?? "").trim().slice(0, 80);
  const tahunAngkatan = (query.get("tahunAngkatan") ?? "").trim();
  const nomorAngkatan = (query.get("nomorAngkatan") ?? "").trim().slice(0, 40);
  const alumniId = (query.get("alumniId") ?? "").trim();
  const requestedLimit = query.get("limit") ?? "all";
  const rowLimit = requestedLimit === "all" ? 1000000 : Number.isInteger(Number(requestedLimit)) && Number(requestedLimit) > 0 ? Math.min(Number(requestedLimit), 1000000) : 1000000;
  if (alumniId && !/^\d+$/.test(alumniId)) {
    return NextResponse.json({ error: "ID alumni tidak valid." }, { status: 400 });
  }
  if (tahunAngkatan && !/^\d{4}$/.test(tahunAngkatan)) {
    return NextResponse.json({ error: "Tahun angkatan harus terdiri dari 4 digit." }, { status: 400 });
  }

  try {
    const rows = await db()`
      SELECT
        COALESCE(nomor_alumni, '') AS "nomorAlumni",
        nama,
        angkatan,
        COALESCE(NULLIF(trim(kategori_program), ''), '') AS "kategoriProgram",
        COALESCE(NULLIF(trim(nomor_angkatan), ''), '') AS "nomorAngkatan",
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
      WHERE (${scope.role === "super_admin"} = TRUE OR upper(COALESCE(NULLIF(trim(kategori_program), ''), angkatan, '')) = ${scope.kategoriProgram ?? ""})
        AND (${alumniId} = '' OR id::text = ${alumniId})
        AND (${status} = '' OR status = ${status})
        AND (${angkatan} = '' OR upper(CASE WHEN (regexp_match(upper(trim(coalesce(angkatan, ''))), '^(PPNK KOLABORASI|PRA|PPRA|P4N|PSA|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1] IS NOT NULL AND upper(trim(coalesce(kategori_program, ''))) IN ('', upper(trim(coalesce(angkatan, '')))) THEN (regexp_match(upper(trim(coalesce(angkatan, ''))), '^(PPNK KOLABORASI|PRA|PPRA|P4N|PSA|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1] ELSE COALESCE(NULLIF(upper(trim(kategori_program)), ''), (regexp_match(upper(trim(coalesce(angkatan, ''))), '^(PPNK KOLABORASI|PRA|PPRA|P4N|PSA|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1], angkatan) END) = upper(${angkatan}))
        AND (
          ${nomorAngkatan} = ''
          OR trim(COALESCE(
            NULLIF(nomor_angkatan, ''),
            (regexp_match(
              upper(trim(coalesce(angkatan, ''))),
              '^(PPNK KOLABORASI|PRA|PPRA|P4N|PSA|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'
            ))[2],
            ''
          )) = ${nomorAngkatan}
        )
        AND (${wilayah} = '' OR wilayah = ${wilayah})
        AND (${nama} = '' OR nama ILIKE ${'%' + nama + '%'})
        AND (${nomorAlumni} = '' OR nomor_alumni = ${nomorAlumni})
        AND (${tahunAngkatan} = '' OR tahun_angkatan::text = ${tahunAngkatan})
      ORDER BY created_at ASC
      LIMIT ${rowLimit}`;

    // Build CSV
    const headers = [
      "Nomor Alumni", "Nama", "Angkatan", "Kategori Program", "Nomor Angkatan", "Tahun Angkatan", "Instansi",
      "Jabatan", "Wilayah", "Alamat", "Email", "Nomor HP", "Status",
      "Alasan Penolakan", "Sumber Data", "Tanggal Input", "Tanggal Update", "Tanggal Verifikasi",
    ];

    const escape = (v: unknown) => {
      let s = v == null ? "" : String(v);
      // Prevent spreadsheet formula injection from user-controlled alumni fields.
      if (/^[\t\r ]*[=+@-]/.test(s)) s = "'" + s;
      if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const csvLines: string[] = [headers.map(escape).join(",")];
    for (const r of rows) {
      csvLines.push([
        r.nomorAlumni, r.nama, r.angkatan, r.kategoriProgram, r.nomorAngkatan, r.tahunAngkatan, r.instansi,
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
        "X-Export-Row-Count": String(rows.length),
      },
    });
  } catch (error) {
    console.error("GET /api/alumni/export failed", error);
    return NextResponse.json({ error: "Gagal mengekspor data alumni." }, { status: 500 });
  }
}
