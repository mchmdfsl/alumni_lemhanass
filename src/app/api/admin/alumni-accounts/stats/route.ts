import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminCategories, getAdminScope } from "@/lib/admin-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const scope = await getAdminScope();
  if (!scope) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (scope.role === "admin" && !scope.kategoriProgram) return NextResponse.json({ error: "Kategori akun Admin belum ditetapkan." }, { status: 403 });
  const allowedCategories = getAdminCategories(scope) ?? [];

  try {
    const [row] = await db()`
      WITH scoped_alumni AS (
        SELECT a.*
        FROM alumni a
        WHERE (${scope.role === "super_admin"} = TRUE OR upper(COALESCE(NULLIF(trim(a.kategori_program), ''), (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|PPRA|P4N|KSA|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1], a.angkatan, '')) = ANY(${allowedCategories}))
      ),
      scoped_accounts AS (
        SELECT aa.*
        FROM alumni_accounts aa
        INNER JOIN scoped_alumni a ON a.id = aa.alumni_id
      )
      SELECT
        (SELECT COUNT(*)::int FROM scoped_alumni) AS "totalAlumni",
        (SELECT COUNT(*)::int FROM scoped_alumni WHERE status = 'Terverifikasi') AS "verifiedAlumni",
        (SELECT COUNT(*)::int FROM scoped_alumni WHERE status = 'Menunggu') AS "pendingAlumni",
        (SELECT COUNT(*)::int FROM scoped_alumni WHERE status = 'Ditolak') AS "rejectedAlumni",
        (SELECT COUNT(*)::int FROM scoped_accounts) AS "totalAccounts",
        (SELECT COUNT(*)::int FROM scoped_accounts WHERE is_active = TRUE) AS "activeAccounts",
        (SELECT COUNT(*)::int FROM scoped_accounts WHERE is_active = FALSE) AS "inactiveAccounts",
        (SELECT COUNT(*)::int FROM scoped_alumni a LEFT JOIN scoped_accounts aa ON aa.alumni_id = a.id WHERE a.status = 'Terverifikasi' AND aa.id IS NULL) AS "verifiedWithoutAccount",
        (SELECT COUNT(*)::int FROM scoped_alumni a INNER JOIN scoped_accounts aa ON aa.alumni_id = a.id WHERE a.status = 'Terverifikasi') AS "verifiedWithAccount",
        (SELECT COUNT(*)::int FROM scoped_accounts WHERE password_hash IS NULL OR trim(password_hash) = '') AS "accountsWithoutPasswordHash"
    `;
    return NextResponse.json({ ok: true, stats: row, generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET alumni account stats failed:", error);
    return NextResponse.json({ error: "Gagal membaca statistik sinkronisasi database." }, { status: 500 });
  }
}
