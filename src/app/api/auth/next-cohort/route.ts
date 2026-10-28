import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedCategories = new Set(["KRA", "PPRA", "P4N", "KSA", "PPSA", "P3N", "PPNK", "PPNK KOLABORASI", "TOT"]);

export async function GET(request: NextRequest) {
  const category = (request.nextUrl.searchParams.get("kategori") || "").trim().toLocaleUpperCase("id-ID");
  if (!allowedCategories.has(category)) {
    return NextResponse.json({ error: "Kategori program tidak valid." }, { status: 400 });
  }

  try {
    const rows = await db()`
      SELECT nomor_angkatan AS "nomorAngkatan"
      FROM alumni
      WHERE upper(trim(coalesce(kategori_program, angkatan, ''))) = ${category}
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
