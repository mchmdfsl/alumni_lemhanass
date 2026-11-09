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
        r.id,
        r.email,
        r.request_type AS "requestType",
        r.status,
        r.created_at AS "createdAt",
        r.reviewed_at AS "reviewedAt",
        r.review_note AS "reviewNote",
        r.alumni_id AS "alumniId",
        COALESCE(a.nama, r.submitted_nama) AS nama,
        COALESCE(a.kategori_program, a.angkatan, r.submitted_kategori_program, r.submitted_angkatan) AS "kategoriProgram",
        reviewer.actor AS "reviewedBy"
      FROM alumni_account_requests r
      LEFT JOIN alumni a ON a.id = r.alumni_id
      LEFT JOIN LATERAL (
        SELECT l.actor
        FROM admin_audit_log l
        WHERE l.details->>'requestId' = r.id::text
          AND l.action IN ('account_request_approved', 'account_request_rejected')
        ORDER BY l.created_at DESC, l.id DESC
        LIMIT 1
      ) reviewer ON TRUE
      WHERE lower(trim(r.status)) <> lower('Menunggu')
        AND (
          ${scope.role === "super_admin"} = TRUE
          OR upper(COALESCE(NULLIF(trim(a.kategori_program), ''), a.angkatan, r.submitted_kategori_program, r.submitted_angkatan, '')) = ANY(${allowedCategories})
        )
      ORDER BY r.reviewed_at DESC NULLS LAST, r.created_at DESC, r.id DESC
      LIMIT 500
    `;
    return NextResponse.json({ data: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET alumni account request history failed:", error);
    return NextResponse.json({ error: "Gagal mengambil riwayat pengajuan akun." }, { status: 500 });
  }
}
