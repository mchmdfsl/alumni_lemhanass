import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminCategories, getAdminScope } from "@/lib/admin-scope";

export const runtime = "nodejs";

export async function GET() {
  const scope = await getAdminScope();
  if (!scope) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (scope.role === "admin" && !scope.kategoriProgram) return NextResponse.json({ error: "Kategori akun Admin belum ditetapkan oleh Super Admin." }, { status: 403 });
  const allowedCategories = getAdminCategories(scope) ?? [];
  try {
    const rows = await db()`
      WITH resolved AS (
        SELECT
          CASE
            WHEN legacy.parts[1] IS NOT NULL
              AND upper(trim(coalesce(a.kategori_program, ''))) IN ('', upper(trim(coalesce(a.angkatan, ''))))
              THEN legacy.parts[1]
            ELSE COALESCE(NULLIF(upper(trim(a.kategori_program)), ''), legacy.parts[1], a.angkatan, '')
          END AS kategori,
          COALESCE(NULLIF(trim(a.wilayah), ''), 'Tidak Diketahui') AS wilayah
        FROM alumni a
        CROSS JOIN LATERAL (
          SELECT regexp_match(
            upper(trim(coalesce(a.angkatan, ''))),
            '^(PPNK KOLABORASI|KRA|PPRA|P4N|KSA|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'
          ) AS parts
        ) legacy
      )
      SELECT wilayah, COUNT(*)::int AS jumlah
      FROM resolved
      WHERE (${scope.role === "super_admin"} = TRUE OR kategori = ANY(${allowedCategories}))
      GROUP BY wilayah
      ORDER BY jumlah DESC
      LIMIT 20`;

    const total = rows.reduce((sum, r) => sum + r.jumlah, 0);
    const data = rows.map((r) => ({
      wilayah: r.wilayah,
      jumlah: r.jumlah,
      persentase: total > 0 ? Math.round((r.jumlah / total) * 1000) / 10 : 0,
    }));

    return NextResponse.json({ data, total });
  } catch (error) {
    console.error("GET /api/stats/wilayah failed", error);
    return NextResponse.json({ error: "Gagal mengambil data statistik wilayah." }, { status: 500 });
  }
}
