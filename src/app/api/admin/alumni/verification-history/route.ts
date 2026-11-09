import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminCategories, getAdminScope } from "@/lib/admin-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const scope = await getAdminScope();
  if (!scope) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (scope.role === "admin" && !scope.kategoriProgram) {
    return NextResponse.json({ error: "Kategori akun Admin belum ditetapkan oleh Super Admin." }, { status: 403 });
  }

  const allowedCategories = getAdminCategories(scope) ?? [];
  try {
    const rows = await db()`
      SELECT
        l.id::text || '-' || a.id::text AS id,
        a.id AS "alumniId",
        a.nama,
        COALESCE(a.nomor_alumni, '') AS "nomorAlumni",
        COALESCE(NULLIF(a.kategori_program, ''), a.angkatan, '') AS "kategoriProgram",
        l.action,
        CASE WHEN l.action = 'status:Terverifikasi' OR l.action = 'bulk_verify' THEN 'Terverifikasi' ELSE 'Ditolak' END AS status,
        l.actor AS "reviewedBy",
        l.created_at AS "reviewedAt",
        COALESCE(l.details->>'alasan', '') AS "reviewNote"
      FROM admin_audit_log l
      JOIN alumni a ON a.id = l.alumni_id
      WHERE l.action IN ('status:Terverifikasi', 'status:Ditolak')
        AND (
          ${scope.role === "super_admin"} = TRUE
          OR upper(COALESCE(NULLIF(trim(a.kategori_program), ''), a.angkatan, '')) = ANY(${allowedCategories})
        )

      UNION ALL

      SELECT
        l.id::text || '-' || a.id::text AS id,
        a.id AS "alumniId",
        a.nama,
        COALESCE(a.nomor_alumni, '') AS "nomorAlumni",
        COALESCE(NULLIF(a.kategori_program, ''), a.angkatan, '') AS "kategoriProgram",
        l.action,
        'Terverifikasi' AS status,
        l.actor AS "reviewedBy",
        l.created_at AS "reviewedAt",
        '' AS "reviewNote"
      FROM admin_audit_log l
      CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(l.details->'alumniIds', '[]'::jsonb)) AS item(alumni_id)
      JOIN alumni a ON a.id = item.alumni_id::bigint
      WHERE l.action = 'bulk_verify'
        AND (
          ${scope.role === "super_admin"} = TRUE
          OR upper(COALESCE(NULLIF(trim(a.kategori_program), ''), a.angkatan, '')) = ANY(${allowedCategories})
        )
      ORDER BY "reviewedAt" DESC
      LIMIT 1000
    `;
    return NextResponse.json({ data: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET alumni verification history failed:", error);
    return NextResponse.json({ error: "Gagal mengambil riwayat verifikasi alumni." }, { status: 500 });
  }
}
