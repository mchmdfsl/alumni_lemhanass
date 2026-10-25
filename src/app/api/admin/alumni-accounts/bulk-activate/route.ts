import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { assignAlumniNumber } from "@/lib/alumni-number";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function makePassword() {
  // Each account receives an independently generated high-entropy password.
  return randomBytes(18).toString("base64url");
}

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  }

  try {
    const credentials = await db().begin(async (tx) => {
      const rows = await tx`
        SELECT a.id, a.nama, a.angkatan, a.nomor_alumni AS "nomorAlumni",
               a.email
        FROM alumni a
        LEFT JOIN alumni_accounts aa ON aa.alumni_id = a.id
        WHERE a.status = 'Terverifikasi'
          AND aa.id IS NULL
        ORDER BY a.angkatan ASC NULLS LAST, a.id ASC
        LIMIT 20
        FOR UPDATE OF a SKIP LOCKED
      `;

      const created: Array<{ nama: string; angkatan: string; nomorAlumni: string; email: string; password: string }> = [];
      for (const row of rows) {
        const alumniId = Number(row.id);
        const angkatan = String(row.angkatan ?? "");
        const nomorAlumni = await assignAlumniNumber(
          tx,
          alumniId,
          angkatan,
          typeof row.nomorAlumni === "string" ? row.nomorAlumni : null,
        );
        const password = makePassword();
        const passwordHash = await hashPassword(password);
        // Existing records may not have email. A reserved internal address satisfies
        // schemas requiring email while login by alumni number remains available.
        const email = typeof row.email === "string" && row.email.trim()
          ? row.email.trim().toLowerCase()
          : `alumni-${alumniId}@akun.invalid`;

        const emailOwner = await tx`
          SELECT id FROM alumni_accounts WHERE lower(email) = lower(${email}) LIMIT 1
        `;
        const accountEmail = emailOwner.length
          ? `alumni-${alumniId}@akun.invalid`
          : email;

        await tx`
          INSERT INTO alumni_accounts (alumni_id, email, password_hash, is_active)
          VALUES (${alumniId}, ${accountEmail}, ${passwordHash}, TRUE)
        `;
        created.push({
          nama: String(row.nama ?? ""),
          angkatan,
          nomorAlumni,
          email: typeof row.email === "string" ? row.email.trim() : "",
          password,
        });
      }
      return created;
    });

    // Passwords are returned only in this admin-authorized response so they can be
    // saved once by the administrator; only hashes are persisted in the database.
    return NextResponse.json({
      ok: true,
      created: credentials.length,
      credentials,
      batchSize: 20,
      hasMore: credentials.length === 20,
      message: credentials.length
        ? "Batch akun berhasil dibuat."
        : "Tidak ada alumni terverifikasi tanpa akun. Tidak ada perubahan dilakukan.",
    });
  } catch (error) {
    console.error("POST bulk alumni account activation failed:", error);
    return NextResponse.json({ error: "Aktivasi akun massal gagal. Periksa struktur database dan pastikan email akun unik." }, { status: 500 });
  }
}
