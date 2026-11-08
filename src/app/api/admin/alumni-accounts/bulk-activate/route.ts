import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { assignAlumniNumber } from "@/lib/alumni-number";
import { getAdminActor, writeAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 500;

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

function makePassword() {
  // Each account receives an independently generated high-entropy password.
  return randomBytes(18).toString("base64url");
}

export async function POST(request: NextRequest) {
  const role = await isAdminAuthenticated();
  if (!role) {
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  }
  if (role !== "super_admin") {
    return NextResponse.json(
      { error: "Hanya Super Admin yang boleh membuat akun secara massal." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const scope = ["single", "cohort", "category", "year", "all"].includes(body?.scope) ? body.scope : "all";
    const alumniId = /^\d+$/.test(String(body?.alumniId ?? "")) ? String(body.alumniId) : "";
    const kategoriProgram = ["KRA", "PPRA", "P4N", "KSA", "PPSA", "P3N", "TAPLAI", "PPNK", "PPNK KOLABORASI", "TOT"].includes(String(body?.kategoriProgram ?? "")) ? String(body.kategoriProgram) : "";
    const nomorAngkatan = String(body?.nomorAngkatan ?? "").trim().slice(0, 40);
    const tahunAngkatan = /^\d{4}$/.test(String(body?.tahunAngkatan ?? "")) ? String(body.tahunAngkatan) : "";
    if (scope === "single" && !alumniId) return NextResponse.json({ error: "Pilih satu alumni yang valid." }, { status: 400 });
    if (scope === "cohort" && (!kategoriProgram || !nomorAngkatan)) return NextResponse.json({ error: "Kategori dan nomor angkatan wajib diisi." }, { status: 400 });
    if (scope === "category" && !kategoriProgram) return NextResponse.json({ error: "Kategori program wajib dipilih." }, { status: 400 });
    if (scope === "year" && !tahunAngkatan) return NextResponse.json({ error: "Tahun angkatan tidak valid." }, { status: 400 });
    const credentials = await db().begin(async (tx) => {
      const rows = await tx`
        SELECT a.id, a.nama, a.angkatan, a.nomor_alumni AS "nomorAlumni", a.email
        FROM alumni a LEFT JOIN alumni_accounts aa ON aa.alumni_id = a.id
        WHERE a.status = 'Terverifikasi' AND aa.id IS NULL
          AND (${scope !== "single"} OR a.id::text = ${alumniId})
          AND (${!["cohort", "category"].includes(scope)} OR upper(CASE WHEN (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1] IS NOT NULL AND upper(trim(coalesce(a.kategori_program, ''))) IN ('', upper(trim(coalesce(a.angkatan, '')))) THEN (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1] ELSE COALESCE(NULLIF(upper(trim(a.kategori_program)), ''), (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1], a.angkatan) END) = upper(${kategoriProgram}))
          AND (${scope !== "cohort"} OR trim(COALESCE(NULLIF(a.nomor_angkatan, ''), (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[2], '')) = ${nomorAngkatan})
          AND (${scope !== "year"} OR a.tahun_angkatan::text = ${tahunAngkatan})
        ORDER BY a.angkatan ASC NULLS LAST, a.id ASC LIMIT ${BATCH_SIZE} FOR UPDATE OF a
      `;

      const prepared = await mapWithConcurrency(rows, 4, async (row) => {
        const password = makePassword();
        return { row, password, passwordHash: await hashPassword(password) };
      });
      const created: Array<{ nama: string; angkatan: string; nomorAlumni: string; email: string; password: string }> = [];
      for (const item of prepared) {
        const row = item.row;
        const alumniId = Number(row.id);
        const angkatan = String(row.angkatan ?? "");
        const nomorAlumni = await assignAlumniNumber(
          tx,
          alumniId,
          angkatan,
          typeof row.nomorAlumni === "string" ? row.nomorAlumni : null,
        );
        const password = item.password;
        const passwordHash = item.passwordHash;
        // Email sengaja NULL sampai alumni sendiri mengisinya melalui halaman profil.
        await tx`
          INSERT INTO alumni_accounts (alumni_id, email, password_hash, is_active)
          VALUES (${alumniId}, NULL, ${passwordHash}, TRUE)
        `;
        created.push({
          nama: String(row.nama ?? ""),
          angkatan,
          nomorAlumni,
          email: "",
          password,
        });
      }
      return created;
    });

    const [remainingRow] = await db()`
      SELECT COUNT(*)::int AS remaining
      FROM alumni a LEFT JOIN alumni_accounts aa ON aa.alumni_id = a.id
      WHERE a.status = 'Terverifikasi' AND aa.id IS NULL
        AND (${scope !== "single"} OR a.id::text = ${alumniId})
        AND (${!["cohort", "category"].includes(scope)} OR upper(CASE WHEN (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1] IS NOT NULL AND upper(trim(coalesce(a.kategori_program, ''))) IN ('', upper(trim(coalesce(a.angkatan, '')))) THEN (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1] ELSE COALESCE(NULLIF(upper(trim(a.kategori_program)), ''), (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1], a.angkatan) END) = upper(${kategoriProgram}))
        AND (${scope !== "cohort"} OR trim(COALESCE(NULLIF(a.nomor_angkatan, ''), (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[2], '')) = ${nomorAngkatan})
        AND (${scope !== "year"} OR a.tahun_angkatan::text = ${tahunAngkatan})
    `;
    const remaining = Number(remainingRow?.remaining ?? 0);
    const actor = await getAdminActor();
    if (actor && credentials.length) await writeAdminAudit(actor, "alumni_accounts_bulk_activated", { count: credentials.length, batchSize: BATCH_SIZE, remaining, scope, alumniId: scope === "single" ? Number(alumniId) : null, kategoriProgram, nomorAngkatan, tahunAngkatan });

    // Passwords are returned only in this super-admin-authorized response so they can be
    // saved once; only hashes are persisted in the database.
    return NextResponse.json({
      ok: true,
      created: credentials.length,
      credentials,
      batchSize: BATCH_SIZE,
      hasMore: remaining > 0,
      remaining,
      message: credentials.length
        ? `Batch ${BATCH_SIZE} akun berhasil dibuat.`
        : "Tidak ada alumni terverifikasi tanpa akun. Tidak ada perubahan dilakukan.",
    });
  } catch (error) {
    console.error("POST bulk alumni account activation failed:", error);
    return NextResponse.json({ error: "Aktivasi akun massal gagal. Periksa struktur database dan pastikan email akun unik." }, { status: 500 });
  }
}
