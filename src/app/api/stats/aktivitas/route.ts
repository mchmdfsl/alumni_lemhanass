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
    const [result] = await db()`
      WITH resolved AS (
        SELECT a.*,
          CASE
            WHEN legacy.parts[1] IS NOT NULL
              AND upper(trim(coalesce(a.kategori_program, ''))) IN ('', upper(trim(coalesce(a.angkatan, ''))))
              THEN legacy.parts[1]
            ELSE COALESCE(NULLIF(upper(trim(a.kategori_program)), ''), legacy.parts[1], a.angkatan, '')
          END AS resolved_category
        FROM alumni a
        CROSS JOIN LATERAL (
          SELECT regexp_match(
            upper(trim(coalesce(a.angkatan, ''))),
            '^(PPNK KOLABORASI|KRA|PPRA|P4N|KSA|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'
          ) AS parts
        ) legacy
      )
      SELECT
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS "dataBaru",
        COUNT(*) FILTER (WHERE updated_at >= date_trunc('month', NOW()) AND updated_at != created_at)::int AS "datadiperbarui",
        COUNT(*) FILTER (WHERE verified_at >= date_trunc('month', NOW()))::int AS "datadiverifikasi",
        COUNT(*) FILTER (WHERE status = 'Ditolak' AND updated_at >= date_trunc('month', NOW()))::int AS "dataditolak"
      FROM resolved
      WHERE (${scope.role === "super_admin"} = TRUE OR resolved_category = ANY(${allowedCategories}))`;

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("GET /api/stats/aktivitas failed", error);
    return NextResponse.json({ error: "Gagal mengambil data aktivitas." }, { status: 500 });
  }
}
