import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminCategories, getAdminScope } from "@/lib/admin-scope";

export const runtime = "nodejs";

export async function GET() {
  const scope = await getAdminScope();
  if (!scope) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (scope.role === "admin" && !scope.kategoriProgram) return NextResponse.json({ error: "Kategori akun Admin belum ditetapkan oleh Super Admin." }, { status: 403 });
  const allowedCategories = getAdminCategories(scope) ?? [];
  try {
    const [result] = await db()`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS "dataBaru",
        COUNT(*) FILTER (WHERE updated_at >= date_trunc('month', NOW()) AND updated_at != created_at)::int AS "datadiperbarui",
        COUNT(*) FILTER (WHERE verified_at >= date_trunc('month', NOW()))::int AS "datadiverifikasi",
        COUNT(*) FILTER (WHERE status = 'Ditolak' AND updated_at >= date_trunc('month', NOW()))::int AS "dataditolak"
      FROM alumni
      WHERE (${scope.role === "super_admin"} = TRUE OR upper(COALESCE(NULLIF(trim(kategori_program), ''), angkatan, '')) = ANY(${allowedCategories}))`;

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("GET /api/stats/aktivitas failed", error);
    return NextResponse.json({ error: "Gagal mengambil data aktivitas." }, { status: 500 });
  }
}
