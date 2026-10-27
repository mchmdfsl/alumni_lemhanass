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

const search = (
  request.nextUrl.searchParams.get("q") ?? ""
)
  .trim()
  .slice(0, 100);

const keyword = `%${search}%`;

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
  WHERE status = 'Terverifikasi'
    AND (
      ${search} = ''
      OR COALESCE(nama, '') ILIKE ${keyword}
      OR COALESCE(kategori_program, angkatan, '') ILIKE ${keyword}
      OR COALESCE(nomor_angkatan, '') ILIKE ${keyword}
      OR COALESCE(tahun_angkatan::text, '') ILIKE ${keyword}
      OR COALESCE(jabatan, '') ILIKE ${keyword}
      OR COALESCE(instansi, '') ILIKE ${keyword}
    )
  ORDER BY kategori_program ASC NULLS LAST, nomor_angkatan ASC NULLS LAST, tahun_angkatan ASC NULLS LAST, nama ASC
  LIMIT 200
`;

return NextResponse.json(
  { data },
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
