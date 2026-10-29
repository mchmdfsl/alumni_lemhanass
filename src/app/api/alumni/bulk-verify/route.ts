import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignAlumniNumber } from "@/lib/alumni-number";
import { getAdminActor } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 100;

export async function POST() {
  const role = await isAdminAuthenticated();
  if (!role) {
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  }
  if (role !== "super_admin") {
    return NextResponse.json(
      { error: "Hanya Super Admin yang boleh melakukan verifikasi massal." },
      { status: 403 },
    );
  }

  try {
    const actor = await getAdminActor();
    const result = await db().begin(async (tx) => {
      const rows = await tx`
        SELECT id, angkatan, nomor_alumni AS "nomorAlumni"
        FROM alumni
        WHERE sumber_data = 'impor'
          AND status = 'Menunggu'
        ORDER BY angkatan ASC NULLS LAST, id ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
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

      if (rows.length > 0) {
        await tx`
          INSERT INTO admin_audit_log (action, actor, details)
          VALUES (
            ${"bulk_verify"},
            ${actor?.actor || "super-admin"},
            ${JSON.stringify({
              actorRole: actor?.role || "super_admin",
              total: rows.length,
              alumniIds: rows.map((row) => Number(row.id)),
              batchSize: BATCH_SIZE,
            })}::jsonb
          )
        `;
      }

      const pending = await tx`
        SELECT COUNT(*)::int AS total
        FROM alumni
        WHERE sumber_data = 'impor'
          AND status = 'Menunggu'
      `;

      return { updated: rows.length, remaining: Number(pending[0]?.total ?? 0) };
    });

    return NextResponse.json({
      message: result.remaining > 0
        ? "Satu kelompok data berhasil diverifikasi."
        : "Verifikasi massal data impor selesai.",
      updated: result.updated,
      remaining: result.remaining,
      hasMore: result.remaining > 0,
    });
  } catch (error) {
    console.error("POST /api/alumni/bulk-verify:", error);
    return NextResponse.json(
      { error: "Gagal memverifikasi kelompok data alumni impor. Periksa skema database dan duplikasi nomor alumni." },
      { status: 500 },
    );
  }
}
