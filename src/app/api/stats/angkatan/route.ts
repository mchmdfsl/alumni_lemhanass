import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const categories = ["KRA", "PPRA", "P4N", "KSA", "PPSA", "P3N", "PPNK", "PPNK KOLABORASI", "TOT"];

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  }

  try {
    type AngkatanStat = {
      angkatan: string;
      kategoriProgram: string;
      nomorAngkatan: string;
      tahunAngkatan: number | null;
      total: number;
      terverifikasi: number;
      menunggu: number;
      ditolak: number;
      wilayahDominan: string | null;
    };

    // Agregasikan data terlebih dahulu. Subquery wilayah membaca hasil agregasi,
    // bukan kolom alumni yang belum dikelompokkan.
    const rows = await db() `
      WITH grouped AS (
        SELECT
          COALESCE(NULLIF(trim(kategori_program), ''), NULLIF(trim(angkatan), ''), 'Tidak Diketahui') AS angkatan,
          COALESCE(NULLIF(trim(kategori_program), ''), NULLIF(trim(angkatan), ''), 'Tidak Diketahui') AS "kategoriProgram",
          COALESCE(NULLIF(trim(nomor_angkatan), ''), '-') AS "nomorAngkatan",
          tahun_angkatan AS "tahunAngkatan",
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'Terverifikasi')::int AS terverifikasi,
          COUNT(*) FILTER (WHERE status = 'Menunggu')::int AS menunggu,
          COUNT(*) FILTER (WHERE status = 'Ditolak')::int AS ditolak
        FROM alumni
        GROUP BY
          COALESCE(NULLIF(trim(kategori_program), ''), NULLIF(trim(angkatan), ''), 'Tidak Diketahui'),
          COALESCE(NULLIF(trim(nomor_angkatan), ''), '-'),
          tahun_angkatan
      )
      SELECT
        g.angkatan,
        g."kategoriProgram",
        g."nomorAngkatan",
        g."tahunAngkatan",
        g.total,
        g.terverifikasi,
        g.menunggu,
        g.ditolak,
        COALESCE(w.wilayah, '-') AS "wilayahDominan"
      FROM grouped g
      LEFT JOIN LATERAL (
        SELECT NULLIF(trim(a2.wilayah), '') AS wilayah
        FROM alumni a2
        WHERE COALESCE(NULLIF(trim(a2.kategori_program), ''), NULLIF(trim(a2.angkatan), ''), 'Tidak Diketahui') = g."kategoriProgram"
          AND COALESCE(NULLIF(trim(a2.nomor_angkatan), ''), '-') = g."nomorAngkatan"
          AND a2.tahun_angkatan IS NOT DISTINCT FROM g."tahunAngkatan"
        GROUP BY a2.wilayah
        ORDER BY COUNT(*) DESC, a2.wilayah ASC NULLS LAST
        LIMIT 1
      ) w ON TRUE
      ORDER BY g.total DESC, g."kategoriProgram" ASC, g."nomorAngkatan" ASC, g."tahunAngkatan" ASC NULLS LAST
    `;

    const typedRows = rows as unknown as AngkatanStat[];
    const existingCategories = new Set(typedRows.map((row) => row.kategoriProgram));
    const emptyCategories: AngkatanStat[] = categories
      .filter((category) => !existingCategories.has(category))
      .map((category) => ({
        angkatan: category,
        kategoriProgram: category,
        nomorAngkatan: "-",
        tahunAngkatan: null,
        total: 0,
        terverifikasi: 0,
        menunggu: 0,
        ditolak: 0,
        wilayahDominan: "-",
      }));

    const data = [...typedRows, ...emptyCategories].sort((a, b) => {
      const categoryOrder = categories.indexOf(a.kategoriProgram);
      const otherOrder = categories.indexOf(b.kategoriProgram);
      if (categoryOrder !== otherOrder) {
        if (categoryOrder < 0) return 1;
        if (otherOrder < 0) return -1;
        return categoryOrder - otherOrder;
      }
      return b.total - a.total || a.nomorAngkatan.localeCompare(b.nomorAngkatan, "id") ||
        (a.tahunAngkatan ?? 9999) - (b.tahunAngkatan ?? 9999);
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/stats/angkatan failed", error);
    return NextResponse.json({ error: "Gagal mengambil data statistik angkatan." }, { status: 500 });
  }
}
