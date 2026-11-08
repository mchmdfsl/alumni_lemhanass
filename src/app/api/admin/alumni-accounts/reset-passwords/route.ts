import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { getAdminActor, writeAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 100;

function encryptCredential(password: string) {
  const key = createHash("sha256").update(process.env.SESSION_SECRET || "").digest();
  if (!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET belum dikonfigurasi.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64") };
}

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
    const kategoriProgram = ["KRA", "PPRA", "P4N", "KSA", "PPSA", "P3N", "TAPLAI", "PPNK", "PPNK KOLABORASI", "TOT"].includes(String(body?.kategoriProgram ?? "")) ? String(body.kategoriProgram) : "";
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
          AND (${!["cohort", "category"].includes(scope)} OR upper(CASE WHEN (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1] IS NOT NULL AND upper(trim(coalesce(a.kategori_program, ''))) IN ('', upper(trim(coalesce(a.angkatan, '')))) THEN (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1] ELSE COALESCE(NULLIF(upper(trim(a.kategori_program)), ''), (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1], a.angkatan) END) = upper(${kategoriProgram}))
          AND (${scope !== "cohort"} OR trim(COALESCE(NULLIF(a.nomor_angkatan, ''), (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[2], '')) = ${nomorAngkatan})
          AND (${scope !== "year"} OR a.tahun_angkatan::text = ${tahunAngkatan})
        ORDER BY aa.id ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE OF aa
      `;
      const prepared = await mapWithConcurrency(rows, 4, async (row) => {
        const password = randomBytes(18).toString("base64url");
        return { row, password, passwordHash: await hashPassword(password) };
      });
      const updated: Array<{ accountId: number; nama: string; angkatan: string; nomorAlumni: string; email: string; password: string }> = [];
      for (const item of prepared) {
        const row = item.row;
        const password = item.password;
        const passwordHash = item.passwordHash;
        await tx`UPDATE alumni_accounts SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${Number(row.accountId)}`;
        const encrypted = encryptCredential(password);
        await tx`INSERT INTO alumni_credential_vault (account_id, encrypted_password, iv, auth_tag, created_at) VALUES (${Number(row.accountId)}, ${encrypted.ciphertext}, ${encrypted.iv}, ${encrypted.authTag}, NOW()) ON CONFLICT (account_id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password, iv = EXCLUDED.iv, auth_tag = EXCLUDED.auth_tag, created_at = NOW()`;
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
    const lastId = credentials.length ? credentials[credentials.length - 1].accountId : afterId;
    const [remainingRow] = await db()`
      SELECT COUNT(*)::int AS remaining
      FROM alumni_accounts aa
      INNER JOIN alumni a ON a.id = aa.alumni_id
      WHERE aa.id > ${lastId}
        AND aa.is_active = TRUE
        AND a.status = 'Terverifikasi'
        AND (${scope !== "single"} OR a.id::text = ${alumniId})
        AND (${!["cohort", "category"].includes(scope)} OR upper(CASE WHEN (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1] IS NOT NULL AND upper(trim(coalesce(a.kategori_program, ''))) IN ('', upper(trim(coalesce(a.angkatan, '')))) THEN (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1] ELSE COALESCE(NULLIF(upper(trim(a.kategori_program)), ''), (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1], a.angkatan) END) = upper(${kategoriProgram}))
        AND (${scope !== "cohort"} OR trim(COALESCE(NULLIF(a.nomor_angkatan, ''), (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[2], '')) = ${nomorAngkatan})
        AND (${scope !== "year"} OR a.tahun_angkatan::text = ${tahunAngkatan})
    `;
    const remaining = Number(remainingRow?.remaining ?? 0);
    const actor = await getAdminActor();
    if (actor && credentials.length) await writeAdminAudit(actor, "alumni_passwords_bulk_reset", { count: credentials.length, remaining, accountIds: credentials.map((item) => item.accountId) });
    return NextResponse.json({
      ok: true,
      credentials,
      lastId,
      hasMore: remaining > 0,
      remaining,
      message: credentials.length ? `Password direset untuk batch ${BATCH_SIZE} akun ini.` : "Tidak ada akun aktif terverifikasi lagi.",
    });
  } catch (error) {
    console.error("POST /api/admin/alumni-accounts/reset-passwords:", error);
    return NextResponse.json({ error: "Reset password gagal. Periksa log server." }, { status: 500 });
  }
}
