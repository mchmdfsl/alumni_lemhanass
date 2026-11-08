import { createDecipheriv, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function decryptPassword(encrypted: string, iv: string, authTag: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET belum dikonfigurasi.");
  const key = createHash("sha256").update(secret).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function csvCell(value: unknown) {
  return '"' + String(value ?? "").replace(/"/g, '""') + '"';
}

export async function HEAD() {
  const role = await isAdminAuthenticated();
  if (!role) return new Response(null, { status: 401 });
  if (role !== "super_admin") return new Response(null, { status: 403 });

  try {
    const [progress] = await db()`
      WITH saved AS (
        SELECT COUNT(*)::int AS saved_count, COALESCE(MAX(account_id), 0)::bigint AS last_account_id
        FROM alumni_credential_vault
      )
      SELECT saved.saved_count AS "savedCount",
             saved.last_account_id AS "lastAccountId",
             (
               SELECT COUNT(*)::int
               FROM alumni_accounts aa
               INNER JOIN alumni a ON a.id = aa.alumni_id
               LEFT JOIN alumni_credential_vault v ON v.account_id = aa.id
               WHERE aa.id <= saved.last_account_id
                 AND aa.is_active = TRUE
                 AND a.status = 'Terverifikasi'
                 AND v.account_id IS NULL
             ) AS "missingBeforeCursor"
      FROM saved
    `;
    return new Response(null, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, private",
        "X-Credential-Count": String(progress?.savedCount ?? 0),
        "X-Credential-Last-Account-Id": String(progress?.lastAccountId ?? 0),
        "X-Credential-Missing-Before-Cursor": String(progress?.missingBeforeCursor ?? 0),
      },
    });
  } catch (error) {
    console.error("Credential progress check failed:", error);
    return new Response(null, { status: 500 });
  }
}

export async function GET() {
  const role = await isAdminAuthenticated();
  if (!role) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (role !== "super_admin") return NextResponse.json({ error: "Hanya Super Admin yang boleh mengunduh kredensial." }, { status: 403 });

  try {
    const rows = await db()`
      SELECT v.account_id AS "accountId", a.nama, a.angkatan,
             a.nomor_alumni AS "nomorAlumni", aa.email,
             v.encrypted_password AS encrypted, v.iv, v.auth_tag AS "authTag"
      FROM alumni_credential_vault v
      INNER JOIN alumni_accounts aa ON aa.id = v.account_id
      INNER JOIN alumni a ON a.id = aa.alumni_id
      ORDER BY v.account_id ASC
    `;
    const headers = ["ID Akun", "Nama", "Angkatan", "ID Alumni", "Email", "Password"];
    const lines = [headers.map(csvCell).join(",")];
    for (const row of rows) {
      const password = decryptPassword(String(row.encrypted), String(row.iv), String(row.authTag));
      lines.push([
        row.accountId, row.nama, row.angkatan, row.nomorAlumni, row.email, password,
      ].map(csvCell).join(","));
    }
    const csv = "\uFEFF" + lines.join("\r\n");
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="kredensial-alumni-lengkap.csv"',
        "Cache-Control": "no-store, private",
        "X-Credential-Count": String(rows.length),
      },
    });
  } catch (error) {
    console.error("Credential vault export failed:", error);
    return NextResponse.json({ error: "Ekspor kredensial tersimpan gagal. Periksa migrasi database dan log server." }, { status: 500 });
  }
}
