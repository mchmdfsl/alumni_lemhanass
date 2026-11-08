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
    if (!hasAccountId && !hasAlumniId) {
      return NextResponse.json({ error: "ID akun alumni wajib diisi." }, { status: 400 });
    }

    const result = await db().begin(async (tx) => {
      const [account] = await tx`
        SELECT aa.id, aa.alumni_id AS "alumniId", aa.is_active AS "isActive",
          a.nama, a.kategori_program AS "kategoriProgram", a.status AS "alumniStatus"
        FROM alumni_accounts aa
        INNER JOIN alumni a ON a.id = aa.alumni_id
        WHERE (${hasAccountId} = TRUE AND aa.id = ${hasAccountId ? requestedAccountId : 0})
           OR (${hasAlumniId} = TRUE AND aa.alumni_id = ${hasAlumniId ? requestedAlumniId : 0})
        ORDER BY aa.id ASC
        LIMIT 1
        FOR UPDATE OF aa
      `;
      if (!account) return { kind: "not_found" as const };
      const category = normalizeProgramCategory(account.kategoriProgram);
      if (!adminCanManageCategory(scope, category)) return { kind: "forbidden" as const };
      if (account.alumniStatus !== "Terverifikasi") return { kind: "not_verified" as const };
      if (account.isActive) return { kind: "active" as const };

      await tx`
        UPDATE alumni_accounts
        SET is_active = TRUE, updated_at = NOW()
        WHERE id = ${Number(account.id)} AND is_active = FALSE
      `;
      return {
        kind: "activated" as const,
        accountId: Number(account.id),
        alumniId: Number(account.alumniId),
        nama: String(account.nama || ""),
        category,
      };
    });

    if (result.kind === "not_found") return NextResponse.json({ error: "Akun alumni tidak ditemukan." }, { status: 404 });
    if (result.kind === "forbidden") return NextResponse.json({ error: "Admin hanya boleh mengaktifkan akun dalam cakupan kategorinya." }, { status: 403 });
    if (result.kind === "not_verified") return NextResponse.json({ error: "Data alumni harus berstatus Terverifikasi sebelum akun diaktifkan." }, { status: 409 });
    if (result.kind === "active") return NextResponse.json({ error: "Akun sudah aktif." }, { status: 409 });

    await writeAdminAudit(actor, "alumni_account_reactivated", {
      accountId: result.accountId,
      kategoriProgram: result.category,
      nama: result.nama,
    }, result.alumniId);
    return NextResponse.json({ ok: true, message: "Akun alumni berhasil diaktifkan kembali." });
  } catch (error) {
    console.error("PATCH /api/admin/alumni-accounts/activate failed:", error);
    return NextResponse.json({ error: "Gagal mengaktifkan akun alumni." }, { status: 500 });
  }
}
