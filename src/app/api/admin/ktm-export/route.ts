import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminScope, getAdminCategories, normalizeProgramCategory } from "@/lib/admin-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns only verified alumni in the caller's authorized category scope.
 * This endpoint is the data source for the bulk KTM ZIP workflow.
 */
export async function GET(request: NextRequest) {
  const scope = await getAdminScope();
  if (!scope) return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 401 });
  if (scope.role === "admin" && !scope.kategoriProgram) {
    return NextResponse.json({ error: "Kategori akun Admin belum ditetapkan oleh Super Admin." }, { status: 403 });
  }

  const categories = getAdminCategories(scope);
  const query = request.nextUrl.searchParams;
  const requestedCategory = normalizeProgramCategory(query.get("kategoriProgram") ?? "");
  if (requestedCategory && scope.role === "admin" && !categories?.includes(requestedCategory)) {
    return NextResponse.json({ error: "Admin tidak memiliki akses ke kategori tersebut." }, { status: 403 });
  }

  const requestedLimit = Number(query.get("limit") ?? 500);
  const requestedOffset = Number(query.get("offset") ?? 0);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.floor(requestedLimit), 1), 500) : 500;
  const offset = Number.isFinite(requestedOffset) ? Math.max(Math.floor(requestedOffset), 0) : 0;

  try {
    const rows = await db()`
      SELECT
        a.id,
        a.nama,
        COALESCE(a.nomor_alumni, '') AS "nomorAlumni",
        CASE
          WHEN legacy.parts[1] IS NOT NULL
            AND upper(trim(coalesce(a.kategori_program, ''))) IN ('', upper(trim(coalesce(a.angkatan, ''))))
            THEN legacy.parts[1]
          ELSE COALESCE(NULLIF(upper(trim(a.kategori_program)), ''), legacy.parts[1], a.angkatan, '')
        END AS "kategoriProgram",
        COALESCE(NULLIF(trim(a.nomor_angkatan), ''), legacy.parts[2], '') AS "nomorAngkatan",
        COALESCE(a.tahun_angkatan::text, '') AS "tahunAngkatan",
        to_jsonb(a)->>'foto_profil' AS "fotoProfil",
        a.ktm_verification_token AS "ktmVerificationToken"
      FROM alumni a
      CROSS JOIN LATERAL (
        SELECT regexp_match(
          upper(trim(coalesce(a.angkatan, ''))),
          '^(PPNK KOLABORASI|KRA|PPRA|P4N|KSA|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'
        ) AS parts
      ) legacy
      WHERE a.status = 'Terverifikasi'
        AND a.ktm_verification_token IS NOT NULL
        AND (${scope.role === "super_admin"} = TRUE OR
          CASE
            WHEN legacy.parts[1] IS NOT NULL
              AND upper(trim(coalesce(a.kategori_program, ''))) IN ('', upper(trim(coalesce(a.angkatan, ''))))
              THEN legacy.parts[1]
            ELSE COALESCE(NULLIF(upper(trim(a.kategori_program)), ''), legacy.parts[1], a.angkatan, '')
          END = ANY(${categories ?? []}))
        AND (${requestedCategory} = '' OR
          CASE
            WHEN legacy.parts[1] IS NOT NULL
              AND upper(trim(coalesce(a.kategori_program, ''))) IN ('', upper(trim(coalesce(a.angkatan, ''))))
              THEN legacy.parts[1]
            ELSE COALESCE(NULLIF(upper(trim(a.kategori_program)), ''), legacy.parts[1], a.angkatan, '')
          END = ${requestedCategory})
      ORDER BY a.id ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [countRow] = await db()`
      SELECT COUNT(*)::int AS total
      FROM alumni a
      CROSS JOIN LATERAL (
        SELECT regexp_match(upper(trim(coalesce(a.angkatan, ''))),
          '^(PPNK KOLABORASI|KRA|PPRA|P4N|KSA|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)') AS parts
      ) legacy
      WHERE a.status = 'Terverifikasi'
        AND a.ktm_verification_token IS NOT NULL
        AND (${scope.role === "super_admin"} = TRUE OR
          CASE
            WHEN legacy.parts[1] IS NOT NULL
              AND upper(trim(coalesce(a.kategori_program, ''))) IN ('', upper(trim(coalesce(a.angkatan, ''))))
              THEN legacy.parts[1]
            ELSE COALESCE(NULLIF(upper(trim(a.kategori_program)), ''), legacy.parts[1], a.angkatan, '')
          END = ANY(${categories ?? []}))
        AND (${requestedCategory} = '' OR
          CASE
            WHEN legacy.parts[1] IS NOT NULL
              AND upper(trim(coalesce(a.kategori_program, ''))) IN ('', upper(trim(coalesce(a.angkatan, ''))))
              THEN legacy.parts[1]
            ELSE COALESCE(NULLIF(upper(trim(a.kategori_program)), ''), legacy.parts[1], a.angkatan, '')
          END = ${requestedCategory})
    `;

    return NextResponse.json({
      data: rows.map((row) => ({ ...row, kategoriProgram: normalizeProgramCategory(row.kategoriProgram) })),
      total: countRow?.total ?? 0,
      limit,
      offset,
      hasMore: offset + rows.length < (countRow?.total ?? 0),
      role: scope.role,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/admin/ktm-export failed:", error);
    return NextResponse.json({ error: "Gagal menyiapkan data KTM. Tidak ada data yang diubah." }, { status: 500 });
  }
}
