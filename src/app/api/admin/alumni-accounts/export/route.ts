import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const role = await isAdminAuthenticated();
  if (!role) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (role !== "super_admin") {
    return NextResponse.json({ error: "Hanya Super Admin yang boleh mengekspor daftar akun user." }, { status: 403 });
  }

  try {
    const accounts = await db().unsafe(`
      SELECT
        aa.id AS "accountId",
        a.id AS "alumniId",
        a.nama,
        a.angkatan,
        a.nomor_alumni AS "nomorAlumni",
        aa.email,
        aa.is_active AS "isActive"
      FROM alumni_accounts aa
      INNER JOIN alumni a ON a.id = aa.alumni_id
      ORDER BY aa.id ASC
    `);
    return NextResponse.json(
      { ok: true, accounts, count: accounts.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("GET alumni account export failed:", error);
    return NextResponse.json({ error: "Gagal mengekspor daftar akun user." }, { status: 500 });
  }
}
