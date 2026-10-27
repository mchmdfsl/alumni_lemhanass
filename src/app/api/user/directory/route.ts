import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAlumniSession } from "@/lib/alumni-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
try {
const session = await getAlumniSession();

if (!session) {
  return NextResponse.json(
    { message: "Silakan login sebagai alumni." },
    { status: 401 }
  );
}

const [account] = await db()`
  SELECT aa.id
  FROM alumni_accounts aa
  INNER JOIN alumni a ON a.id = aa.alumni_id
  WHERE aa.id = ${session.accountId}
    AND a.id = ${session.alumniId}
    AND aa.is_active = TRUE
    AND a.status = 'Terverifikasi'
  LIMIT 1
`;

if (!account) {
  return NextResponse.json(
    {
      message:
        "Akun alumni tidak aktif atau belum terverifikasi.",
    },
    { status: 403 }
  );
}

const params = request.nextUrl.searchParams;
const search = (params.get("q") ?? "").trim().slice(0, 100);
const category = (params.get("kategori") ?? "").trim().slice(0, 80);
const requestedLimit = Number(params.get("limit") ?? 12);
const requestedOffset = Number(params.get("offset") ?? 0);
const limit = Number.isFinite(requestedLimit)
  ? Math.min(Math.max(Math.floor(requestedLimit), 1), 100)
  : 12;
const offset = Number.isFinite(requestedOffset)
  ? Math.min(Math.max(Math.floor(requestedOffset), 0), 1_000_000)
  : 0;
const keyword = `%${search}%`;

const where = `
  status = 'Terverifikasi'
  AND (
    ${search} = ''
    OR COALESCE(nama, '') ILIKE ${keyword}
    OR COALESCE(kategori_program, angkatan, '') ILIKE ${keyword}
    OR COALESCE(nomor_angkatan, '') ILIKE ${keyword}
    OR COALESCE(tahun_angkatan::text, '') ILIKE ${keyword}
    OR COALESCE(jabatan, '') ILIKE ${keyword}
    OR COALESCE(instansi, '') ILIKE ${keyword}
  )
  AND (
    ${category} = ''
    OR COALESCE(NULLIF(trim(kategori_program), ''), angkatan) = ${category}
  )
`;

const data = await db()`
  SELECT
    id,
    nama,
    COALESCE(kategori_program, angkatan) AS "kategoriProgram",
    COALESCE(nomor_angkatan, '') AS "nomorAngkatan",
    tahun_angkatan AS "tahunAngkatan",
    angkatan,
    jabatan,
    instansi,
    to_jsonb(alumni)->>'foto_profil' AS "fotoProfil"
  FROM alumni
  WHERE ${where}
  ORDER BY kategori_program ASC NULLS LAST, nomor_angkatan ASC NULLS LAST, tahun_angkatan ASC NULLS LAST, nama ASC
  LIMIT ${limit}
  OFFSET ${offset}
`;

const [count] = await db()`
  SELECT COUNT(*)::int AS total
  FROM alumni
  WHERE ${where}
`;

return NextResponse.json(
  { data, total: count?.total ?? 0, limit, offset },
  {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  }
);

} catch (error) {
console.error("GET /api/user/directory:", error);

return NextResponse.json(
  { message: "Gagal mengambil direktori alumni." },
  { status: 500 }
);

}
}
