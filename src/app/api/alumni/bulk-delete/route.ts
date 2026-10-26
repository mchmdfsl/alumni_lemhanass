import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminActor } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const role = await isAdminAuthenticated();
  if (!role) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (role !== "super_admin") {
    return NextResponse.json(
      { error: "Hanya Super Admin yang boleh menghapus data alumni secara massal." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const rawIds = body?.ids;
  if (body?.confirmation !== "HAPUS" || !Array.isArray(rawIds) || rawIds.length < 2 || rawIds.length > 500) {
    return NextResponse.json(
      { error: "Konfirmasi tidak valid. Pilih minimal 2 dan maksimal 500 ID alumni lalu ketik HAPUS." },
      { status: 400 },
    );
  }
  const ids = Array.from(new Set(rawIds.map((value: unknown) => Number(value))));
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    return NextResponse.json({ error: "Daftar ID alumni tidak valid." }, { status: 400 });
  }

  try {
    const actor = await getAdminActor();
    const result = await db().begin(async (tx) => {
      const rows = (await tx`
        SELECT id, nama FROM alumni
        WHERE id = ANY(${ids}::bigint[])
        FOR UPDATE
      `) as unknown as { id: number | string; nama: string }[];
      if (rows.length !== ids.length) {
        throw new Error("Sebagian ID alumni tidak ditemukan. Tidak ada data yang dihapus.");
      }
      await tx`
        INSERT INTO admin_audit_log (action, alumni_id, actor, details)
        VALUES ('bulk_delete', NULL, ${actor?.actor || "admin"}, ${JSON.stringify({
          alumniIds: ids,
          names: rows.map((row: { nama: string }) => row.nama),
          total: rows.length,
          actorRole: actor?.role || "unknown",
        })}::jsonb)
      `;
      await tx`DELETE FROM alumni_accounts WHERE alumni_id = ANY(${ids}::bigint[])`;
      await tx`DELETE FROM alumni WHERE id = ANY(${ids}::bigint[])`;
      return { deletedIds: rows.map((row: { id: number | string }) => Number(row.id)), total: rows.length };
    });

    return NextResponse.json({
      ok: true,
      deleted: result.total,
      deletedIds: result.deletedIds,
      message: `Berhasil menghapus ${result.total} data alumni beserta akun yang terhubung.`,
    });
  } catch (error) {
    console.error("POST /api/alumni/bulk-delete failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus data alumni secara massal." },
      { status: 500 },
    );
  }
}
