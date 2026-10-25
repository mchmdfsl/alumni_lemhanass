import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignAlumniNumber } from "@/lib/alumni-number";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  }

  try {
    const updated = await db().begin(async (tx) => {
      const rows = await tx`
        SELECT id, angkatan, nomor_alumni AS "nomorAlumni"
        FROM alumni
        WHERE sumber_data = 'impor'
          AND status IS DISTINCT FROM 'Terverifikasi'
        ORDER BY angkatan ASC NULLS LAST, id ASC
        FOR UPDATE
      `;

      for (const row of rows) {
        await assignAlumniNumber(
          tx,
          Number(row.id),
          String(row.angkatan ?? ""),
          typeof row.nomorAlumni === "string" ? row.nomorAlumni : null,
        );
        await tx`
          UPDATE alumni
          SET status = 'Terverifikasi',
              verified_at = COALESCE(verified_at, NOW()),
              updated_at = NOW(),
              alasan_penolakan = NULL
          WHERE id = ${Number(row.id)}
        `;
      }

      return rows.length;
    });

    return NextResponse.json({
      message: "Data alumni hasil impor berhasil diverifikasi dan nomor alumni dipastikan tersedia.",
      updated,
    });
  } catch (error) {
    console.error("POST /api/alumni/bulk-verify:", error);
    return NextResponse.json(
      { error: "Gagal memverifikasi data alumni hasil impor. Periksa skema database dan duplikasi nomor alumni." },
      { status: 500 },
    );
  }
}
