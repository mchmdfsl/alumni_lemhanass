import { createDecipheriv, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function decryptPassword(encrypted: string, iv: string, authTag: string) {
  const secret = process.env.DATABASE_URL;
  if (!secret) throw new Error("DATABASE_URL belum dikonfigurasi.");
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
