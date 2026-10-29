import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const role = await isAdminAuthenticated();
  if (!role) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (role !== "super_admin") return NextResponse.json({ error: "Hanya Super Admin yang boleh melihat statistik sinkronisasi akun." }, { status: 403 });

  try {
    const [row] = await db().unsafe("SELECT " +
      "(SELECT COUNT(*)::int FROM alumni) AS \"totalAlumni\", " +
      "(SELECT COUNT(*)::int FROM alumni WHERE status = 'Terverifikasi') AS \"verifiedAlumni\", " +
      "(SELECT COUNT(*)::int FROM alumni WHERE status = 'Menunggu') AS \"pendingAlumni\", " +
      "(SELECT COUNT(*)::int FROM alumni WHERE status = 'Ditolak') AS \"rejectedAlumni\", " +
      "(SELECT COUNT(*)::int FROM alumni_accounts) AS \"totalAccounts\", " +
      "(SELECT COUNT(*)::int FROM alumni_accounts WHERE is_active = TRUE) AS \"activeAccounts\", " +
      "(SELECT COUNT(*)::int FROM alumni_accounts WHERE is_active = FALSE) AS \"inactiveAccounts\", " +
      "(SELECT COUNT(*)::int FROM alumni a LEFT JOIN alumni_accounts aa ON aa.alumni_id = a.id WHERE a.status = 'Terverifikasi' AND aa.id IS NULL) AS \"verifiedWithoutAccount\", " +
      "(SELECT COUNT(*)::int FROM alumni a INNER JOIN alumni_accounts aa ON aa.alumni_id = a.id WHERE a.status = 'Terverifikasi') AS \"verifiedWithAccount\", " +
      "(SELECT COUNT(*)::int FROM alumni_accounts WHERE password_hash IS NULL OR trim(password_hash) = '') AS \"accountsWithoutPasswordHash\"");
    return NextResponse.json({ ok: true, stats: row, generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET alumni account stats failed:", error);
    return NextResponse.json({ error: "Gagal membaca statistik sinkronisasi database." }, { status: 500 });
  }
}
