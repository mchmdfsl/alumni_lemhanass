import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminActor, writeAdminAudit } from "@/lib/admin-audit";
import { adminCanManageCategory, getAdminScope, normalizeProgramCategory } from "@/lib/admin-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const scope = await getAdminScope();
  if (!scope) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (scope.role === "admin" && !scope.kategoriProgram) {
    return NextResponse.json({ error: "Kategori akun Admin belum ditetapkan." }, { status: 403 });
  }

  try {
    const data = await db()`
      SELECT r.id, r.account_id AS "accountId", r.alumni_id AS "alumniId",
        r.reason, r.status, r.admin_note AS "adminNote",
        r.created_at AS "createdAt", r.reviewed_at AS "reviewedAt",
        a.nama, a.nomor_alumni AS "nomorAlumni",
        a.kategori_program AS "kategoriProgram", aa.is_active AS "isActive"
      FROM alumni_account_reactivation_requests r
      INNER JOIN alumni_accounts aa ON aa.id = r.account_id
      INNER JOIN alumni a ON a.id = r.alumni_id
      ORDER BY CASE WHEN r.status = 'Menunggu' THEN 0 ELSE 1 END, r.created_at DESC
      LIMIT 300
    `;
    type ReactivationRow = {
      id: number;
      accountId: number;
      alumniId: number;
      reason: string;
      status: string;
      adminNote: string | null;
      createdAt: Date | string;
      reviewedAt: Date | string | null;
      nama: string;
      nomorAlumni: string | null;
      kategoriProgram: string | null;
      isActive: boolean;
    };
    const rows = data as unknown as ReactivationRow[];
    const filtered = scope.role === "super_admin" ? rows : rows.filter((row) =>
      adminCanManageCategory(scope, normalizeProgramCategory(row.kategoriProgram))
    );
    return NextResponse.json({ data: filtered });
  } catch (error) {
    console.error("GET admin reactivation requests failed:", error);
    return NextResponse.json({ error: "Gagal mengambil pengajuan aktivasi kembali." }, { status: 500 });
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
    if (status === "Ditolak" && !adminNote) {
      return NextResponse.json({ error: "Alasan penolakan wajib diisi." }, { status: 400 });
    }

    const result = await db().begin(async (tx) => {
      const [row] = await tx`
        SELECT r.id, r.account_id AS "accountId", r.alumni_id AS "alumniId",
          r.status, aa.is_active AS "isActive",
          a.nama, a.kategori_program AS "kategoriProgram"
        FROM alumni_account_reactivation_requests r
        INNER JOIN alumni_accounts aa ON aa.id = r.account_id
        INNER JOIN alumni a ON a.id = r.alumni_id
        WHERE r.id = ${id}
        FOR UPDATE OF r, aa
      `;
      if (!row) return { kind: "not_found" as const };
      if (row.status !== "Menunggu") return { kind: "reviewed" as const };
      const category = normalizeProgramCategory(row.kategoriProgram);
      if (!adminCanManageCategory(scope, category)) return { kind: "forbidden" as const };
      if (status === "Disetujui" && row.isActive) return { kind: "already_active" as const };

      if (status === "Disetujui") {
        await tx`
          UPDATE alumni_accounts
          SET is_active = TRUE, updated_at = NOW()
          WHERE id = ${Number(row.accountId)} AND is_active = FALSE
        `;
      }
      await tx`
        UPDATE alumni_account_reactivation_requests
        SET status = ${status}, admin_note = ${adminNote || null},
          reviewed_by = ${actor.actor}, reviewed_at = NOW()
        WHERE id = ${id}
      `;
      return {
        kind: "saved" as const,
        accountId: Number(row.accountId),
        alumniId: Number(row.alumniId),
        nama: String(row.nama || ""),
        category,
      };
    });

    if (result.kind === "not_found") return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
    if (result.kind === "reviewed") return NextResponse.json({ error: "Pengajuan sudah diproses." }, { status: 409 });
    if (result.kind === "forbidden") return NextResponse.json({ error: "Admin hanya dapat memproses akun dalam cakupan kategori yang dikelolanya." }, { status: 403 });
    if (result.kind === "already_active") return NextResponse.json({ error: "Akun sudah aktif. Muat ulang daftar pengajuan." }, { status: 409 });

    await writeAdminAudit(actor, status === "Disetujui" ? "alumni_account_reactivated" : "alumni_account_reactivation_rejected", {
      requestId: id, accountId: result.accountId, nama: result.nama,
      kategoriProgram: result.category, adminNote: adminNote || null,
    }, result.alumniId);

    return NextResponse.json({
      ok: true,
      message: status === "Disetujui" ? "Akun alumni berhasil diaktifkan kembali." : "Pengajuan aktivasi kembali ditolak.",
    });
  } catch (error) {
    console.error("PATCH admin reactivation request failed:", error);
    return NextResponse.json({ error: "Gagal memproses pengajuan aktivasi kembali." }, { status: 500 });
  }
}
