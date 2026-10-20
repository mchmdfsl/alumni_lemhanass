import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  try {
    const [result] = await db()`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS "dataBaru",
        COUNT(*) FILTER (WHERE updated_at >= date_trunc('month', NOW()) AND updated_at != created_at)::int AS "datadiperbarui",
        COUNT(*) FILTER (WHERE verified_at >= date_trunc('month', NOW()))::int AS "datadiverifikasi",
        COUNT(*) FILTER (WHERE status = 'Ditolak' AND updated_at >= date_trunc('month', NOW()))::int AS "dataditolak"
      FROM alumni`;

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("GET /api/stats/aktivitas failed", error);
    return NextResponse.json({ error: "Gagal mengambil data aktivitas." }, { status: 500 });
  }
}
