import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedCategories = new Set(["KRA", "PPRA", "P4N", "KSA", "PPSA", "P3N", "PPNK", "PPNK KOLABORASI", "TOT"]);

export async function GET(request: NextRequest) {
  const category = (request.nextUrl.searchParams.get("kategori") || "").trim().toLocaleUpperCase("id-ID");
  if (!/^[A-Z0-9]+(?:[ ][A-Z0-9]+){0,3}$/.test(category)) {
    return NextResponse.json({ error: "Kategori program tidak valid." }, { status: 400 });
  }

  try {
    const rows = await db()`
      SELECT COALESCE(NULLIF(trim(nomor_angkatan), ''), legacy.parts[2]) AS "nomorAngkatan"
      FROM alumni
      CROSS JOIN LATERAL (
        SELECT regexp_match(
          upper(trim(coalesce(angkatan, ''))),
          '^(PPNK KOLABORASI|KRA|PPRA|P4N|KSA|PPSA|P3N|PPNK|TOT)[[:space:]]+([0-9]+)'
        ) AS parts
      ) legacy
      WHERE upper(trim(coalesce(
        CASE
          WHEN legacy.parts[1] IS NOT NULL
            AND upper(trim(coalesce(kategori_program, ''))) IN ('', upper(trim(coalesce(angkatan, ''))))
            THEN legacy.parts[1]
          ELSE NULLIF(trim(kategori_program), '')
        END,
        legacy.parts[1],
        angkatan,
        ''
      ))) = ${category}
      UNION ALL
      SELECT submitted_nomor_angkatan AS "nomorAngkatan"
      FROM alumni_account_requests
      WHERE status = 'Menunggu'
        AND request_type = 'register'
        AND upper(trim(coalesce(submitted_kategori_program, submitted_angkatan, ''))) = ${category}
    `;
    const max = rows.reduce((current, row) => {
      const value = String(row.nomorAngkatan ?? "").trim();
      if (!/^\d+$/.test(value)) return current;
      const number = Number(value);
      return Number.isSafeInteger(number) ? Math.max(current, number) : current;
    }, 0);
    return NextResponse.json({ kategoriProgram: category, nomorAngkatan: String(max + 1) });
  } catch (error) {
    console.error("GET /api/auth/next-cohort failed:", error);
    return NextResponse.json({ error: "Gagal menentukan nomor angkatan berikutnya." }, { status: 500 });
  }
}
