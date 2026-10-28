import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { getAdminActor, writeAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const role = await isAdminAuthenticated();
  if (!role) {
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  }
  if (role !== "super_admin") {
    return NextResponse.json(
      { error: "Hanya Super Admin yang boleh mereset password secara massal." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const afterId = Number.isSafeInteger(body?.afterId) && body.afterId >= 0 ? body.afterId : 0;
    const scope = ["single", "cohort", "category", "year", "all"].includes(body?.scope) ? body.scope : "all";
    const alumniId = /^\d+$/.test(String(body?.alumniId ?? "")) ? String(body.alumniId) : "";
    const kategoriProgram = ["KRA", "PPRA", "P4N", "KSA", "PPSA", "P3N", "PPNK"].includes(String(body?.kategoriProgram ?? "")) ? String(body.kategoriProgram) : "";
    const nomorAngkatan = String(body?.nomorAngkatan ?? "").trim().slice(0, 40);
    const tahunAngkatan = /^\d{4}$/.test(String(body?.tahunAngkatan ?? "")) ? String(body.tahunAngkatan) : "";
    if (scope === "single" && !alumniId) return NextResponse.json({ error: "Pilih satu alumni yang valid." }, { status: 400 });
    if (scope === "cohort" && (!kategoriProgram || !nomorAngkatan)) return NextResponse.json({ error: "Kategori dan nomor angkatan wajib diisi." }, { status: 400 });
    if (scope === "category" && !kategoriProgram) return NextResponse.json({ error: "Kategori program wajib dipilih." }, { status: 400 });
    if (scope === "year" && !/^\d{4}$/.test(tahunAngkatan)) return NextResponse.json({ error: "Tahun angkatan tidak valid." }, { status: 400 });
    const credentials = await db().begin(async (tx) => {
      const rows = await tx`
        SELECT aa.id AS "accountId", a.nama, a.angkatan,
               a.nomor_alumni AS "nomorAlumni", aa.email
        FROM alumni_accounts aa
        INNER JOIN alumni a ON a.id = aa.alumni_id
        WHERE aa.id > ${afterId}
          AND aa.is_active = TRUE
          AND a.status = 'Terverifikasi'
          AND (${scope !== "single"} OR a.id::text = ${alumniId})
          AND (${!["cohort", "category"].includes(scope)} OR upper(COALESCE(NULLIF(trim(a.kategori_program), ''), a.angkatan)) = upper(${kategoriProgram}))
          AND (${scope !== "cohort"} OR trim(COALESCE(NULLIF(a.nomor_angkatan, ''), (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|PPRA|P4N|KSA|PPSA|P3N|PPNK|TOT)[[:space:]]+([0-9]+)'))[2], '')) = ${nomorAngkatan})
          AND (${scope !== "year"} OR a.tahun_angkatan::text = ${tahunAngkatan})
        ORDER BY aa.id ASC
        LIMIT 10
        FOR UPDATE OF aa
      `;
      const updated: Array<{ accountId: number; nama: string; angkatan: string; nomorAlumni: string; email: string; password: string }> = [];
      for (const row of rows) {
        const password = randomBytes(18).toString("base64url");
        const passwordHash = await hashPassword(password);
        await tx`UPDATE alumni_accounts SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${Number(row.accountId)}`;
        updated.push({
          accountId: Number(row.accountId),
          nama: String(row.nama ?? ""),
          angkatan: String(row.angkatan ?? ""),
          nomorAlumni: String(row.nomorAlumni ?? ""),
          email: String(row.email ?? ""),
          password,
        });
      }
      return updated;
    });
    const actor = await getAdminActor();
    if (actor && credentials.length) await writeAdminAudit(actor, "alumni_passwords_bulk_reset", { count: credentials.length, accountIds: credentials.map((item) => item.accountId) });
    return NextResponse.json({
      ok: true,
      credentials,
      lastId: credentials.length ? credentials[credentials.length - 1].accountId : afterId,
      hasMore: credentials.length === 10,
      message: credentials.length ? "Password direset untuk batch ini." : "Tidak ada akun aktif terverifikasi lagi.",
    });
  } catch (error) {
    console.error("POST /api/admin/alumni-accounts/reset-passwords:", error);
    return NextResponse.json({ error: "Reset password gagal. Periksa log server." }, { status: 500 });
  }
}
