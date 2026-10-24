
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAlumniSession } from "@/lib/alumni-session";

export const runtime = "nodejs";

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
        { message: "Akun alumni tidak aktif atau belum terverifikasi." },
        { status: 403 }
      );
    }

    const search = (
      request.nextUrl.searchParams.get("q") ?? ""
    ).trim().slice(0, 100);

    const keyword = `%${search}%`;

    const data = await db()`
      SELECT
        id,
        nama,
        angkatan,
        jabatan,
        instansi
      FROM alumni
      WHERE status = 'Terverifikasi'
        AND (
          ${search} = ''
          OR COALESCE(nama, '') ILIKE ${keyword}
          OR COALESCE(angkatan::text, '') ILIKE ${keyword}
          OR COALESCE(jabatan, '') ILIKE ${keyword}
          OR COALESCE(instansi, '') ILIKE ${keyword}
        )
      ORDER BY angkatan ASC NULLS LAST, nama ASC
      LIMIT 200
    `;

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/user/directory:", error);

    return NextResponse.json(
      { message: "Gagal mengambil direktori alumni." },
      { status: 500 }
    );
  }
}
