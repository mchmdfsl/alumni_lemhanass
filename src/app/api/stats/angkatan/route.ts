import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  try {
    const rows = await db()`
      SELECT
        angkatan,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'Terverifikasi')::int AS terverifikasi,
        COUNT(*) FILTER (WHERE status = 'Menunggu')::int AS menunggu,
        COUNT(*) FILTER (WHERE status = 'Ditolak')::int AS ditolak,
        (
          SELECT CASE WHEN wilayah = '' OR wilayah IS NULL THEN '-' ELSE wilayah END
          FROM alumni a2
          WHERE a2.angkatan = alumni.angkatan
          GROUP BY wilayah
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) AS "wilayahDominan"
      FROM alumni
      GROUP BY angkatan
      ORDER BY COUNT(*) DESC`;

    const categories = ["P3N", "P4N", "PPNK", "TOT"];
    const existing = new Set(rows.map((row: { angkatan: string }) => row.angkatan));
    const emptyCategories = categories.filter((category) => !existing.has(category)).map((angkatan) => ({
      angkatan, total: 0, terverifikasi: 0, menunggu: 0, ditolak: 0, wilayahDominan: "-",
    }));
    const data = [...emptyCategories, ...rows].sort((a, b) => {
      const order = categories.indexOf(a.angkatan);
      const other = categories.indexOf(b.angkatan);
      if (order >= 0 || other >= 0) return (order < 0 ? 99 : order) - (other < 0 ? 99 : other);
      return b.total - a.total;
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/stats/angkatan failed", error);
    return NextResponse.json({ error: "Gagal mengambil data statistik angkatan." }, { status: 500 });
  }
}
