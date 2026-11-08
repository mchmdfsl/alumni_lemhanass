import { NextResponse } from "next/server";
import { createRealtime, rawSql } from "@neon/realtime/server";
import { getAdminCategories, getAdminScope } from "@/lib/admin-scope";
import { getAlumniSession } from "@/lib/alumni-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AlumniChangeRow = {
  id: number;
  alumni_updated_at: string | null;
  account_updated_at: string | null;
};

function getRealtimeServer() {
  const secret = process.env.NEON_REALTIME_SECRET;
  if (!secret) throw new Error("NEON_REALTIME_SECRET belum dikonfigurasi.");
  return createRealtime({ secret, db: "neondb" });
}

export async function GET() {
  try {
    const realtime = getRealtimeServer();
    const adminScope = await getAdminScope();

    if (adminScope) {
      if (adminScope.role === "admin" && !adminScope.kategoriProgram) {
        return NextResponse.json({ error: "Kategori Admin belum ditetapkan." }, { status: 403 });
      }

      let query;
      if (adminScope.role === "super_admin") {
        query = rawSql<AlumniChangeRow>(`
          SELECT a.id, a.updated_at AS alumni_updated_at, account.updated_at AS account_updated_at
          FROM alumni a
          LEFT JOIN LATERAL (
            SELECT aa.updated_at FROM alumni_accounts aa
            WHERE aa.alumni_id = a.id ORDER BY aa.id ASC LIMIT 1
          ) account ON TRUE
        `);
      } else {
        const categories = getAdminCategories(adminScope) ?? [];
        if (categories.length === 0) {
          return NextResponse.json({ error: "Cakupan kategori Admin kosong." }, { status: 403 });
        }
        // The only interpolated values here are fixed server-side category constants.
        const safeCategories = categories.map((category) => "'" + category.replace(/'/g, "''") + "'").join(", ");
        query = rawSql<AlumniChangeRow>(`
          SELECT a.id, a.updated_at AS alumni_updated_at, account.updated_at AS account_updated_at
          FROM alumni a
          CROSS JOIN LATERAL (
            SELECT regexp_match(
              upper(trim(coalesce(a.angkatan, ''))),
              '^(PPNK KOLABORASI|KRA|PPRA|P4N|KSA|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'
            ) AS parts
          ) legacy
          LEFT JOIN LATERAL (
            SELECT aa.updated_at FROM alumni_accounts aa
            WHERE aa.alumni_id = a.id ORDER BY aa.id ASC LIMIT 1
          ) account ON TRUE
          WHERE CASE
            WHEN legacy.parts[1] IS NOT NULL
              AND upper(trim(coalesce(a.kategori_program, ''))) IN ('', upper(trim(coalesce(a.angkatan, ''))))
              THEN legacy.parts[1]
            ELSE COALESCE(NULLIF(upper(trim(a.kategori_program)), ''), legacy.parts[1], a.angkatan, '')
          END IN (${safeCategories})
        `);
      }

      const sealedQuery = await realtime.seal({ query });
      return NextResponse.json(sealedQuery, { headers: { "Cache-Control": "no-store" } });
    }

    const session = await getAlumniSession();
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const query = rawSql<AlumniChangeRow>(
      `SELECT a.id, a.updated_at AS alumni_updated_at, aa.updated_at AS account_updated_at
       FROM alumni a
       INNER JOIN alumni_accounts aa ON aa.alumni_id = a.id
       WHERE a.id = $1 AND aa.id = $2 AND aa.is_active = TRUE AND a.status = 'Terverifikasi'`,
      [session.alumniId, session.accountId],
    );
    const sealedQuery = await realtime.seal({ query });
    return NextResponse.json(sealedQuery, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/realtime/alumni:", error);
    return NextResponse.json({ error: "Gagal menyiapkan sinkronisasi realtime." }, { status: 500 });
  }
}
