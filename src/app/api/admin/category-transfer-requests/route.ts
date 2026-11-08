import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminActor, writeAdminAudit } from "@/lib/admin-audit";
import { adminCanManageCategory, getAdminScope, normalizeProgramCategory } from "@/lib/admin-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const scope = await getAdminScope();
  if (!scope) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (scope.role === "admin" && !scope.kategoriProgram) return NextResponse.json({ error: "Kategori akun Admin belum ditetapkan." }, { status: 403 });
  try {
    const data = await db()`
      SELECT r.id, r.alumni_id AS "alumniId", r.current_kategori_program AS "currentKategoriProgram",
        r.requested_kategori_program AS "requestedKategoriProgram", r.reason, r.status,
        r.admin_note AS "adminNote", r.created_at AS "createdAt", r.reviewed_at AS "reviewedAt",
        a.nama, a.nomor_alumni AS "nomorAlumni"
      FROM alumni_category_transfer_requests r
      INNER JOIN alumni a ON a.id = r.alumni_id
      WHERE ${scope.role === "super_admin"} = TRUE
        OR (r.current_kategori_program = ANY(${scope.role === "admin" ? [scope.kategoriProgram].filter(Boolean) : []})
          OR r.requested_kategori_program = ANY(${scope.role === "admin" ? [scope.kategoriProgram].filter(Boolean) : []}))
      ORDER BY CASE WHEN r.status = 'Menunggu' THEN 0 ELSE 1 END, r.created_at DESC
      LIMIT 300
    `;
    const filtered = scope.role === "super_admin" ? data : data.filter((row: { currentKategoriProgram: string; requestedKategoriProgram: string }) =>
      adminCanManageCategory(scope, normalizeProgramCategory(row.currentKategoriProgram)) &&
      adminCanManageCategory(scope, normalizeProgramCategory(row.requestedKategoriProgram))
    );
    return NextResponse.json({ data: filtered });
  } catch (error) {
    console.error("GET admin category transfer requests failed:", error);
    return NextResponse.json({ error: "Gagal mengambil pengajuan perpindahan kategori." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const scope = await getAdminScope();
  const actor = await getAdminActor();
  if (!scope || !actor) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  try {
    const body = await request.json();
    const id = Number(body.id);
    const status = body.status;
    const adminNote = typeof body.adminNote === "string" ? body.adminNote.trim().slice(0, 1000) : "";
    if (!Number.isSafeInteger(id) || id < 1 || !["Disetujui", "Ditolak"].includes(status)) {
      return NextResponse.json({ error: "Keputusan pengajuan tidak valid." }, { status: 400 });
    }
    if (status === "Ditolak" && !adminNote) return NextResponse.json({ error: "Alasan penolakan wajib diisi." }, { status: 400 });
    const result = await db().begin(async (tx) => {
      const [row] = await tx`
        SELECT id, alumni_id AS "alumniId", current_kategori_program AS "currentCategory",
          requested_kategori_program AS "requestedCategory", status
        FROM alumni_category_transfer_requests WHERE id = ${id} FOR UPDATE
      `;
      if (!row) return { kind: "not_found" as const };
      if (row.status !== "Menunggu") return { kind: "reviewed" as const };
      if (!adminCanManageCategory(scope, normalizeProgramCategory(row.currentCategory)) ||
          !adminCanManageCategory(scope, normalizeProgramCategory(row.requestedCategory))) return { kind: "forbidden" as const };
      if (status === "Disetujui") {
        const [alumni] = await tx`
          SELECT id, kategori_program AS kategori FROM alumni WHERE id = ${row.alumniId} FOR UPDATE
        `;
        if (!alumni || normalizeProgramCategory(alumni.kategori) !== normalizeProgramCategory(row.currentCategory)) return { kind: "stale" as const };
        await tx`
          UPDATE alumni SET kategori_program = ${normalizeProgramCategory(row.requestedCategory)}, updated_at = NOW()
          WHERE id = ${row.alumniId}
        `;
      }
      await tx`
        UPDATE alumni_category_transfer_requests
        SET status = ${status}, admin_note = ${adminNote || null},
          reviewed_by = ${actor.actor}, reviewed_at = NOW()
        WHERE id = ${id}
      `;
      return { kind: "saved" as const, alumniId: Number(row.alumniId), oldCategory: row.currentCategory, newCategory: row.requestedCategory };
    });
    if (result.kind === "not_found") return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
    if (result.kind === "reviewed") return NextResponse.json({ error: "Pengajuan sudah diproses." }, { status: 409 });
    if (result.kind === "forbidden") return NextResponse.json({ error: "Admin hanya dapat menyetujui perpindahan dalam cakupan kategori yang dikelolanya. Perpindahan lintas kelompok ditangani Super Admin." }, { status: 403 });
    if (result.kind === "stale") return NextResponse.json({ error: "Kategori alumni sudah berubah. Muat ulang data sebelum memproses." }, { status: 409 });
    await writeAdminAudit(actor, "alumni_category_transfer_reviewed", {
      requestId: id, status, oldCategory: result.oldCategory, newCategory: result.newCategory, adminNote: adminNote || null,
    }, result.alumniId);
    return NextResponse.json({ ok: true, message: status === "Disetujui" ? "Perpindahan kategori disetujui." : "Pengajuan perpindahan kategori ditolak." });
  } catch (error) {
    console.error("PATCH admin category transfer request failed:", error);
    return NextResponse.json({ error: "Gagal memproses pengajuan perpindahan kategori." }, { status: 500 });
  }
}
