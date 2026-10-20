import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  try {
    const rows = await db()`
      SELECT
        CASE WHEN wilayah = '' OR wilayah IS NULL THEN 'Tidak Diketahui' ELSE wilayah END AS wilayah,
        COUNT(*)::int AS jumlah
      FROM alumni
      GROUP BY wilayah
      ORDER BY jumlah DESC
      LIMIT 20`;

    const total = rows.reduce((sum, r) => sum + r.jumlah, 0);
    const data = rows.map((r) => ({
      wilayah: r.wilayah,
      jumlah: r.jumlah,
      persentase: total > 0 ? Math.round((r.jumlah / total) * 1000) / 10 : 0,
    }));

    return NextResponse.json({ data, total });
  } catch (error) {
    console.error("GET /api/stats/wilayah failed", error);
    return NextResponse.json({ error: "Gagal mengambil data statistik wilayah." }, { status: 500 });
  }
}
