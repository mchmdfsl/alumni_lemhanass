import { NextResponse } from "next/server";
import { getAdminCategories, getAdminScope } from "@/lib/admin-scope";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const scope = await getAdminScope();
  if (!scope) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (scope.role === "admin" && !scope.kategoriProgram) {
    return NextResponse.json({ error: "Kategori akun Admin belum ditetapkan." }, { status: 403 });
  }
  const allowedCategories = getAdminCategories(scope) ?? [];

  try {
    const accounts = await db()`
      SELECT
        aa.id AS "accountId",
        a.id AS "alumniId",
        a.nama,
        a.angkatan,
        a.nomor_alumni AS "nomorAlumni",
        aa.email,
        aa.is_active AS "isActive"
      FROM alumni_accounts aa
      INNER JOIN alumni a ON a.id = aa.alumni_id
      WHERE (
        ${scope.role === "super_admin"} = TRUE
        OR upper(COALESCE(NULLIF(trim(a.kategori_program), ''), (regexp_match(
          upper(trim(coalesce(a.angkatan, ''))),
          '^(PPNK KOLABORASI|KRA|PPRA|P4N|KSA|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'
        ))[1], a.angkatan, '')) = ANY(${allowedCategories})
      )
      ORDER BY aa.id ASC
    `;
    return NextResponse.json(
      { ok: true, accounts, count: accounts.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("GET alumni account export failed:", error);
    return NextResponse.json({ error: "Gagal mengekspor daftar akun user." }, { status: 500 });
  }
}
