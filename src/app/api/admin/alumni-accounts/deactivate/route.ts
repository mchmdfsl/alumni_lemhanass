import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminActor, writeAdminAudit } from "@/lib/admin-audit";
import { adminCanManageCategory, getAdminScope, normalizeProgramCategory } from "@/lib/admin-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const scope = await getAdminScope();
  const actor = await getAdminActor();
  if (!scope || !actor) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });

  try {
    const body = await request.json();
    const requestedAccountId = Number(body.accountId);
    const requestedAlumniId = Number(body.alumniId);
    const hasAccountId = Number.isSafeInteger(requestedAccountId) && requestedAccountId > 0;
    const hasAlumniId = Number.isSafeInteger(requestedAlumniId) && requestedAlumniId > 0;
    const accountId = hasAccountId ? requestedAccountId : 0;
    const alumniId = hasAlumniId ? requestedAlumniId : 0;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
    if ((!hasAccountId && !hasAlumniId) || !reason) {
      return NextResponse.json({ error: "ID akun dan alasan penonaktifan wajib diisi." }, { status: 400 });
    }

    const result = await db().begin(async (tx) => {
      const [account] = await tx`
        SELECT aa.id, aa.alumni_id AS "alumniId", aa.is_active AS "isActive",
          a.nama, a.kategori_program AS "kategoriProgram", a.angkatan
        FROM alumni_accounts aa
        INNER JOIN alumni a ON a.id = aa.alumni_id
        WHERE (${hasAccountId} = TRUE AND aa.id = ${accountId})
           OR (${hasAlumniId} = TRUE AND aa.alumni_id = ${alumniId})
        ORDER BY aa.id ASC
        LIMIT 1
        FOR UPDATE OF aa
      `;
      if (!account) return { kind: "not_found" as const };
      const category = normalizeProgramCategory(account.kategoriProgram);
      if (!adminCanManageCategory(scope, category)) return { kind: "forbidden" as const };
      if (!account.isActive) return { kind: "inactive" as const };

      await tx`
        UPDATE alumni_accounts
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = ${Number(account.id)}
      `;
      return { kind: "deactivated" as const, accountId: Number(account.id), alumniId: Number(account.alumniId), nama: String(account.nama || ""), category };
    });

    if (result.kind === "not_found") return NextResponse.json({ error: "Akun alumni tidak ditemukan." }, { status: 404 });
    if (result.kind === "forbidden") return NextResponse.json({ error: "Admin hanya boleh menonaktifkan akun dalam cakupan kategorinya." }, { status: 403 });
    if (result.kind === "inactive") return NextResponse.json({ error: "Akun sudah nonaktif." }, { status: 409 });

    await writeAdminAudit(actor, "alumni_account_deactivated", {
      accountId: result.accountId, reason, kategoriProgram: result.category, nama: result.nama,
    }, result.alumniId);
    return NextResponse.json({ ok: true, message: "Akun alumni berhasil dinonaktifkan. Data alumni tetap tersimpan." });
  } catch (error) {
    console.error("PATCH /api/admin/alumni-accounts/deactivate failed:", error);
    return NextResponse.json({ error: "Gagal menonaktifkan akun alumni." }, { status: 500 });
  }
}
