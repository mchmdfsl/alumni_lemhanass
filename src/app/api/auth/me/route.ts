
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getAlumniSession } from "@/lib/alumni-session";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Periksa sesi admin terlebih dahulu.
    if (await isAdminAuthenticated()) {
      return NextResponse.json({
        authenticated: true,
        user: {
          username: process.env.ADMIN_USERNAME || "admin",
          email: process.env.ADMIN_EMAIL || null,
          role: "admin",
        },
      });
    }

    // Jika bukan admin, periksa sesi alumni.
    const session = await getAlumniSession();

    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 },
      );
    }

    // Pastikan akun masih aktif dan terhubung
    // dengan data alumni yang sudah terverifikasi.
    const [account] = await db()`
      SELECT
        aa.id AS "accountId",
        aa.email,
        a.id AS "alumniId",
        a.nama,
        a.nomor_alumni AS "nomorAlumni"
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
        { authenticated: false },
        { status: 401 },
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: account.alumniId,
        accountId: account.accountId,
        nama: account.nama,
        email: account.email,
        nomorAlumni: account.nomorAlumni,
        role: "alumni",
      },
    });
  } catch (error) {
    console.error("GET /api/auth/me failed:", error);

    return NextResponse.json(
      { error: "Gagal memeriksa sesi pengguna." },
      { status: 500 },
    );
  }
}
