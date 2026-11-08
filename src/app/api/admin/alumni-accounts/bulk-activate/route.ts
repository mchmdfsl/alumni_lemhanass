import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminCategories, getAdminScope } from "@/lib/admin-scope";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { assignAlumniNumber } from "@/lib/alumni-number";
import { getAdminActor, writeAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 100;

function encryptCredential(password: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET harus berisi minimal 32 karakter.");
  }
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
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

function makePassword() {
  // Each account receives an independently generated high-entropy password.
  return randomBytes(18).toString("base64url");
}

export async function POST(request: NextRequest) {
  const adminScope = await getAdminScope();
  if (!adminScope) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (adminScope.role === "admin" && !adminScope.kategoriProgram) return NextResponse.json({ error: "Kategori akun Admin belum ditetapkan." }, { status: 403 });
  const allowedCategories = getAdminCategories(adminScope) ?? [];

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
        AND (${adminScope.role === "super_admin"} = TRUE OR upper(COALESCE(NULLIF(trim(a.kategori_program), ''), (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|PPRA|P4N|KSA|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1], a.angkatan, '')) = ANY(${allowedCategories}))
        ORDER BY a.angkatan ASC NULLS LAST, a.id ASC LIMIT ${BATCH_SIZE} FOR UPDATE OF a
      `;

      const prepared = await mapWithConcurrency(rows, 4, async (row) => {
        const password = makePassword();
        const existingNumber = typeof row.nomorAlumni === "string" ? row.nomorAlumni : null;
        const nomorAlumni = existingNumber?.trim()
          ? existingNumber.trim()
          : await assignAlumniNumber(tx, Number(row.id), String(row.angkatan ?? ""), null);
        return { row, password, passwordHash: await hashPassword(password), nomorAlumni };
      });

      // Insert akun sekaligus, bukan satu query database per alumni.
      // Ini memangkas round-trip database tanpa mengurangi kekuatan hash password.
      const inserted = await tx`
        INSERT INTO alumni_accounts (alumni_id, email, password_hash, is_active)
        SELECT input.alumni_id, NULL, input.password_hash, TRUE
        FROM unnest(${tx.array(prepared.map((item) => Number(item.row.id))) }::bigint[],
                    ${tx.array(prepared.map((item) => item.passwordHash)) }::text[])
          AS input(alumni_id, password_hash)
        ON CONFLICT (alumni_id) DO NOTHING
        RETURNING alumni_id
      `;
      const insertedIds = new Set(inserted.map((item) => Number(item.alumni_id)));
      const newlyCreated = prepared.filter((item) => insertedIds.has(Number(item.row.id)));
      if (newlyCreated.length) {
        const accountRows = await tx`
          SELECT id, alumni_id FROM alumni_accounts
          WHERE alumni_id = ANY(${tx.array(newlyCreated.map((item) => Number(item.row.id)))}::bigint[])
        `;
        const byAlumniId = new Map(accountRows.map((row) => [Number(row.alumni_id), Number(row.id)]));
        const vaultRows = newlyCreated.map((item) => ({
          accountId: byAlumniId.get(Number(item.row.id)),
          encrypted: encryptCredential(item.password),
        })).filter((item) => item.accountId);
        await tx`
          INSERT INTO alumni_credential_vault (account_id, encrypted_password, iv, auth_tag, created_at)
          SELECT input.account_id, input.encrypted_password, input.iv, input.auth_tag, NOW()
          FROM unnest(
            ${tx.array(vaultRows.map((item) => item.accountId as number))}::bigint[],
            ${tx.array(vaultRows.map((item) => item.encrypted.ciphertext))}::text[],
            ${tx.array(vaultRows.map((item) => item.encrypted.iv))}::text[],
            ${tx.array(vaultRows.map((item) => item.encrypted.authTag))}::text[]
          ) AS input(account_id, encrypted_password, iv, auth_tag)
        `;
      }
      return prepared
        .filter((item) => insertedIds.has(Number(item.row.id)))
        .map((item) => ({
          nama: String(item.row.nama ?? ""),
          angkatan: String(item.row.angkatan ?? ""),
          nomorAlumni: item.nomorAlumni,
          email: "",
          password: item.password,
        }));
    });

    const [remainingRow] = await db()`
      SELECT COUNT(*)::int AS remaining
      FROM alumni a LEFT JOIN alumni_accounts aa ON aa.alumni_id = a.id
      WHERE a.status = 'Terverifikasi' AND aa.id IS NULL
        AND (${scope !== "single"} OR a.id::text = ${alumniId})
        AND (${!["cohort", "category"].includes(scope)} OR upper(CASE WHEN (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1] IS NOT NULL AND upper(trim(coalesce(a.kategori_program, ''))) IN ('', upper(trim(coalesce(a.angkatan, '')))) THEN (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1] ELSE COALESCE(NULLIF(upper(trim(a.kategori_program)), ''), (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1], a.angkatan) END) = upper(${kategoriProgram}))
        AND (${scope !== "cohort"} OR trim(COALESCE(NULLIF(a.nomor_angkatan, ''), (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|KSA|PPRA|P4N|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[2], '')) = ${nomorAngkatan})
        AND (${scope !== "year"} OR a.tahun_angkatan::text = ${tahunAngkatan})
        AND (${adminScope.role === "super_admin"} = TRUE OR upper(COALESCE(NULLIF(trim(a.kategori_program), ''), (regexp_match(upper(trim(coalesce(a.angkatan, ''))), '^(PPNK KOLABORASI|KRA|PPRA|P4N|KSA|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)'))[1], a.angkatan, '')) = ANY(${allowedCategories}))
    `;
    const remaining = Number(remainingRow?.remaining ?? 0);
    const actor = await getAdminActor();
    if (actor && credentials.length) await writeAdminAudit(actor, "alumni_accounts_bulk_activated", { count: credentials.length, batchSize: BATCH_SIZE, remaining, scope, alumniId: scope === "single" ? Number(alumniId) : null, kategoriProgram, nomorAngkatan, tahunAngkatan });

    // Passwords are returned only to an authorized Admin within their category scope or Super Admin so they can be
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
