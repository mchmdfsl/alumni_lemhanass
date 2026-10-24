
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Tidak memiliki akses." },
      { status: 401 },
    );
  }

  try {
    const rows = await db()`
      SELECT
        r.id,
        r.email,
        r.request_type AS "requestType",
        r.status,
        r.created_at AS "createdAt",
        r.alumni_id AS "alumniId",
        a.nomor_alumni AS "nomorAlumni",
        a.nama AS "namaAlumni"
      FROM alumni_account_requests r
      LEFT JOIN alumni a ON a.id = r.alumni_id
      WHERE r.status = 'Menunggu'
      ORDER BY r.created_at ASC
      LIMIT 100
    `;

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("GET alumni account requests failed:", error);

    return NextResponse.json(
      { error: "Gagal mengambil daftar pendaftaran akun." },
      { status: 500 },
    );
  }
}
