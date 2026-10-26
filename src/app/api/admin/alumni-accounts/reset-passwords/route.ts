import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

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
    const credentials = await db().begin(async (tx) => {
      const rows = await tx`
        SELECT aa.id AS "accountId", a.nama, a.angkatan,
               a.nomor_alumni AS "nomorAlumni", aa.email
        FROM alumni_accounts aa
        INNER JOIN alumni a ON a.id = aa.alumni_id
        WHERE aa.id > ${afterId}
          AND aa.is_active = TRUE
          AND a.status = 'Terverifikasi'
        ORDER BY aa.id ASC
        LIMIT 10
        FOR UPDATE OF aa
      `;
      const updated: Array<{ accountId: number; nama: string; angkatan: string; nomorAlumni: string; email: string; password: string }> = [];
      for (const row of rows) {
        const password = randomBytes(18).toString("base64url");
        const passwordHash = await hashPassword(password);
        await tx`UPDATE alumni_accounts SET password_hash = ${passwordHash} WHERE id = ${Number(row.accountId)}`;
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
